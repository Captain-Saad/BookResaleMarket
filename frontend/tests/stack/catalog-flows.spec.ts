import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { PublicBookPage } from "@/lib/types";

const API = "http://localhost:8010/api/v1";
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/bookloop";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAwAAAASCAIAAADgy6hbAAAAGUlEQVR4nGNkYPjPQAgwEVQxqmhUEZUVAQDF9QEjE2IuhwAAAABJRU5ErkJggg==",
  "base64",
);
const cli = (module: string, ...args: string[]) =>
  execFileSync("uv", ["run", "python", "-m", module, ...args], {
    cwd: "../backend",
    env: {
      ...process.env,
      BOOKLOOP_ENV: "test",
      BOOKLOOP_DATABASE_URL: DATABASE_URL,
      BOOKLOOP_DATABASE_DIRECT_URL: DATABASE_URL,
    },
  });

test("real catalog filters, history and reservation visibility", async ({
  page,
  context,
}, info) => {
  test.setTimeout(120_000);
  const prefix = `Catalog ${Date.now()} ${Math.random().toString(36).slice(2)}`;
  const email = `${prefix.replaceAll(" ", "-").toLowerCase()}@example.com`;
  const request = context.request;
  expect(
    (
      await request.post(`${API}/auth/register`, {
        data: { email, password: "a-good-password", displayName: "Catalog seller" },
      })
    ).status(),
  ).toBe(202);
  expect(
    (
      await request.post(`${API}/auth/login`, { data: { email, password: "a-good-password" } })
    ).status(),
  ).toBe(200);
  expect((await request.post(`${API}/me/roles/seller`)).status()).toBe(200);
  expect((await request.post(`${API}/me/seller-verification`)).status()).toBe(200);
  cli("scripts.grant_role", email, "admin");
  expect(
    (
      await request.post(`${API}/dev/seller-verification`, { data: { email, status: "verified" } })
    ).status(),
  ).toBe(200);
  const address = await (
    await request.post(`${API}/me/addresses`, {
      data: {
        recipientName: "Private catalog recipient",
        line1: "Private catalog street",
        postalCode: "02108",
        city: "Boston",
        region: "MA",
        country: "US",
      },
    })
  ).json();
  const ids = new Map<string, string>();
  for (const fulfillment of ["on_demand", "warehouse"] as const) {
    const listing = await (
      await request.post(`${API}/listings`, {
        data: {
          title: `${prefix} ${fulfillment}`,
          author: "Catalog author",
          condition: "good",
          fulfillment,
          currency: "USD",
          priceMinor: 1234,
          addressId: address.id,
        },
      })
    ).json();
    ids.set(fulfillment, listing.id);
    for (let photo = 0; photo < (fulfillment === "on_demand" ? 2 : 1); photo++) {
      const ticket = await (
        await request.post(`${API}/listings/${listing.id}/photos/upload-url`, {
          data: { contentType: "image/png", sizeBytes: PNG.length },
        })
      ).json();
      expect(
        (
          await request.put(ticket.uploadUrl, {
            data: PNG,
            headers: { "Content-Type": "image/png" },
          })
        ).status(),
      ).toBe(204);
      expect(
        (
          await request.post(`${API}/listings/${listing.id}/photos/complete`, {
            data: { photoId: ticket.photoId },
          })
        ).status(),
      ).toBe(200);
    }
    expect((await request.post(`${API}/listings/${listing.id}/publish`)).status()).toBe(200);
  }
  const response = await request.get(`${API}/listings?q=${encodeURIComponent(prefix)}`);
  const books: PublicBookPage = await response.json();
  expect(books.items).toHaveLength(2);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["etag"]).toBeUndefined();
  expect(JSON.stringify(books)).not.toMatch(/Private catalog|02108|addressId|sellerId|uploadToken/);
  const html = await (await request.get(`/books?q=${encodeURIComponent(prefix)}`)).text();
  expect(html).toContain(`${prefix} on_demand`);
  expect(html).not.toContain("Private catalog street");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/books?q=${encodeURIComponent(prefix)}`);
  const active = page.getByRole("link", { name: `View book: ${prefix} on_demand`, exact: true });
  const incoming = page.getByRole("link", { name: `View book: ${prefix} warehouse`, exact: true });
  await expect(active).toBeVisible();
  await expect(incoming).toBeVisible();
  const detailUrl = `/books/${ids.get("on_demand")}`;
  const detailHtml = await (await request.get(detailUrl)).text();
  expect(detailHtml).toContain(`${prefix} on_demand`);
  expect(detailHtml).toContain('"@type":"Book"');
  expect(detailHtml).not.toMatch(/Private catalog|02108|sellerId|addressId/);
  await active.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${prefix} on_demand`);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `http://localhost:3200${detailUrl}`,
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    `${prefix} on_demand`,
  );
  const structured = page.locator('script[type="application/ld+json"]');
  expect(JSON.parse((await structured.textContent())!).offers).toMatchObject({
    price: "12.34",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  });
  await page.getByRole("button", { name: "Photo 2", exact: true }).click();
  const zoom = page.getByRole("button", {
    name: `Enlarge photo: ${prefix} on_demand`,
    exact: true,
  });
  await expect
    .poll(() => zoom.locator("img").evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);
  await zoom.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(zoom).toBeFocused();
  await expect(page.getByText("Delivery estimate available at checkout")).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const path = info.outputPath(`detail-real-${theme}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`detail-real-${theme}`, { path, contentType: "image/png" });
  }
  await page.goBack();
  await expect(active).toBeVisible();
  const mobile = (page.viewportSize()?.width ?? 0) < 1024;
  if (mobile) await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = mobile ? page.getByRole("dialog") : page.locator("aside");
  await filters
    .getByRole("combobox", { name: "Fulfillment", exact: true })
    .selectOption("warehouse");
  await filters.getByRole("combobox", { name: "Currency", exact: true }).selectOption("USD");
  await filters.getByLabel("Maximum price").fill("15.00");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(page).toHaveURL(/fulfillment=warehouse/);
  await expect(active).toHaveCount(0);
  await expect(incoming).toBeVisible();
  await page.reload();
  await expect(incoming).toBeVisible();
  await expect(active).toHaveCount(0);
  await page.goBack();
  await expect(active).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  for (const theme of ["dark", "light"] as const) {
    await page.evaluate((value) => {
      document.documentElement.dataset.theme = value;
    }, theme);
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const path = info.outputPath(`catalog-real-${theme}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`catalog-real-${theme}`, { path, contentType: "image/png" });
  }
  cli("scripts.reserve_listing", ids.get("on_demand")!);
  await expect(active).toHaveCount(0, { timeout: 2500 });
  await expect(incoming).toBeVisible();
  const reserved = await request.get(`${API}/listings/${ids.get("on_demand")}`);
  expect(reserved.status()).toBe(200);
  expect((await reserved.json()).available).toBe(false);
  await page.goto(detailUrl);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`${prefix} on_demand`);
  await expect(page.getByRole("button", { name: "Reserved", exact: true }).first()).toBeDisabled();
  expect(
    JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!).offers
      .availability,
  ).toBe("https://schema.org/OutOfStock");
  const draft = await (
    await request.post(`${API}/listings`, { data: { title: "Private unpublished copy" } })
  ).json();
  const missing = await request.get(`/books/${draft.id}`);
  expect((await request.get(`${API}/listings/${draft.id}`)).status()).toBe(404);
  // The app-wide loading boundary commits a streamed response before notFound resolves.
  expect([200, 404]).toContain(missing.status());
  const missingHtml = await missing.text();
  expect(missingHtml).not.toContain("Private unpublished copy");
  expect(missingHtml).toMatch(/name="robots"[^>]*content="noindex/);
  await page.goto(`/books/${draft.id}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
});
