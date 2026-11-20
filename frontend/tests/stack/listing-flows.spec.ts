import { execFileSync } from "node:child_process";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { SellerListingPage } from "@/lib/types";

const API = "http://localhost:8010/api/v1";
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/bookloop";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAwAAAASCAIAAADgy6hbAAAAGUlEQVR4nGNkYPjPQAgwEVQxqmhUEZUVAQDF9QEjE2IuhwAAAABJRU5ErkJggg==",
  "base64",
);

test("seller autosaves, resumes, uploads, publishes both fulfillment models and deactivates", async ({
  page,
  context,
}, info) => {
  test.setTimeout(120_000);
  const email = `listing-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const request = context.request;
  expect(
    (
      await request.post(`${API}/auth/register`, {
        data: { email, password: "a-good-password", displayName: "Ada Seller" },
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
  execFileSync("uv", ["run", "python", "-m", "scripts.grant_role", email, "admin"], {
    cwd: "../backend",
    env: { ...process.env, BOOKLOOP_ENV: "test", BOOKLOOP_DATABASE_DIRECT_URL: DATABASE_URL },
  });
  expect(
    (
      await request.post(`${API}/dev/seller-verification`, { data: { email, status: "verified" } })
    ).status(),
  ).toBe(200);
  const address = await (
    await request.post(`${API}/me/addresses`, {
      data: {
        recipientName: "Ada Seller",
        line1: "Private pickup street",
        city: "Boston",
        region: "MA",
        postalCode: "02108",
        country: "US",
      },
    })
  ).json();
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const fulfillment of ["on_demand", "warehouse"] as const) {
    const title = `${fulfillment} physical copy`;
    await page.goto("/sell");
    await page.getByLabel("Book title", { exact: true }).fill(title);
    await page.getByLabel("Author", { exact: true }).fill("An Author");
    await expect(page.getByRole("status")).toHaveText("Draft saved.");
    await page.goto("/sell/listings");
    const card = page
      .getByRole("listitem")
      .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
    await card.getByRole("button", { name: "Edit listing" }).click();
    await expect(page.getByLabel("Book title", { exact: true })).toHaveValue(title);
    await page.getByRole("button", { name: /3 Photos/ }).click();
    await page
      .getByLabel("Upload photos")
      .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: PNG });
    const image = page.getByAltText("Seller's book photo");
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    await page.getByRole("button", { name: /4 Fulfillment/ }).click();
    await page
      .getByRole("radio", {
        name: fulfillment === "warehouse" ? /^Warehouse/ : /^On-demand pickup/,
      })
      .check();
    await page.getByLabel("Pickup / return address").selectOption(address.id);
    await page.getByRole("button", { name: /5 Price/ }).click();
    await page.getByLabel("Price", { exact: true }).fill("12.34");
    await page.getByRole("button", { name: /6 Review/ }).click();
    if (fulfillment === "on_demand") {
      for (const theme of ["dark", "light"] as const) {
        await page.evaluate((value) => {
          document.documentElement.dataset.theme = value;
        }, theme);
        expect(
          (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
        ).toEqual([]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        const path = info.outputPath(`listing-review-${theme}.png`);
        await page.screenshot({ path, fullPage: true });
        await info.attach(`listing-review-${theme}`, { path, contentType: "image/png" });
      }
    }
    await page.getByRole("button", { name: "Publish listing", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("Listing published");
    const listings: SellerListingPage = await (await request.get(`${API}/me/listings`)).json();
    const listing = listings.items.find((item) => item.title === title)!;
    expect(listing.status).toBe(fulfillment === "warehouse" ? "incoming" : "active");
    expect(JSON.stringify(listing)).not.toContain("Private pickup street");
    if (fulfillment === "on_demand") {
      expect(
        (
          await request.patch(`${API}/listings/${listing.id}`, {
            data: { version: listing.version, condition: "new" },
          })
        ).status(),
      ).toBe(409);
      await page.getByRole("button", { name: /1 Book/ }).click();
      await expect(page.getByLabel("Book title", { exact: true })).toBeDisabled();
    }
  }
  await page.goto("/account/addresses");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("used by a listing");
  await page.goto("/sell/listings");
  for (let index = 0; index < 2; index++) {
    const available = page
      .getByRole("button", { name: "Deactivate", exact: true })
      .and(page.locator(":enabled"));
    await available.first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Confirm deactivation" }).click();
    await expect(
      page.getByRole("button", { name: "Deactivate", exact: true }).and(page.locator(":disabled")),
    ).toHaveCount(index + 1);
  }
  expect((await request.delete(`${API}/me/addresses/${address.id}`)).status()).toBe(204);
});
