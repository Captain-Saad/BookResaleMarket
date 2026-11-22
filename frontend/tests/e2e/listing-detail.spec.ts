import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { catalogBooks, mockCatalogPage, mockPublicDetail } from "@/lib/api/mocks/catalog";
import type { PublicBookDetail } from "@/lib/types";
const PHOTO = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAwAAAASCAIAAADgy6hbAAAAGUlEQVR4nGNkYPjPQAgwEVQxqmhUEZUVAQDF9QEjE2IuhwAAAABJRU5ErkJggg==",
  "base64",
);
const book = mockPublicDetail();
const mock = async (page: Page, status: PublicBookDetail["status"] = "active") => {
  await page.route("https://covers.openlibrary.org/**", (route) =>
    route.fulfill({ body: PHOTO, contentType: "image/png" }),
  );
  await page.route("**/api/v1/listings**", (route) => {
    const url = new URL(route.request().url());
    return route.fulfill({
      json: url.pathname.endsWith("/listings")
        ? mockCatalogPage(url.searchParams)
        : { ...book, status, available: status === "active" },
    });
  });
};
test("reader opens a copy, switches photos and closes zoom with restored focus", async ({
  page,
}) => {
  await mock(page);
  await page.goto("/books");
  await page.getByRole("link", { name: "View book: Frankenstein", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frankenstein");
  await expect(page.getByText("Delivery estimate available at checkout")).toBeVisible();
  await page.getByRole("button", { name: "Photo 2", exact: true }).click();
  await expect(page.getByRole("button", { name: "Photo 2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const zoom = page.getByRole("button", { name: "Enlarge photo: Frankenstein", exact: true });
  await expect(zoom.locator("img")).toHaveAttribute("src", book.photos[1]!.url);
  await expect
    .poll(() =>
      zoom.locator("img").evaluate((element) => (element as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  expect((await zoom.boundingBox())!.height).toBeLessThan(page.viewportSize()!.height);
  for (const price of await page.getByText("€8.00", { exact: true }).all()) {
    if (!(await price.isVisible())) continue;
    expect(
      await price.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return range.getClientRects().length;
      }),
    ).toBe(1);
  }
  await zoom.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(zoom).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Buy this copy", exact: true }).first(),
  ).toBeDisabled();
  for (const button of await page.getByRole("button", { name: "Buy this copy", exact: true }).all())
    await expect(button).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const status of ["reserved", "sold"] as const) {
  test(`${status} detail remains visible without a purchase action`, async ({ page }) => {
    await mock(page, status);
    await page.goto(`/books/${catalogBooks[1]!.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frankenstein");
    const label = status === "sold" ? "Sold" : "Reserved";
    await expect(page.getByRole("button", { name: label, exact: true }).first()).toBeDisabled();
    for (const button of await page.getByRole("button", { name: label, exact: true }).all())
      await expect(button).toBeDisabled();
    await expect(
      page.getByText(
        status === "sold"
          ? "This copy has found its next reader."
          : "Another reader is checking out. Check back soon.",
      ),
    ).toBeVisible();
  });
}
for (const colorScheme of ["dark", "light"] as const) {
  test(`detail has accessible ${colorScheme} surfaces`, async ({ page }, info) => {
    await mock(page, "incoming");
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto(`/books/${catalogBooks[1]!.id}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Frankenstein");
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze())
        .violations,
    ).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const path = info.outputPath(`listing-detail-${colorScheme}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`listing-detail-${colorScheme}`, { path, contentType: "image/png" });
    await page.getByRole("button", { name: "Enlarge photo: Frankenstein", exact: true }).click();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
    ).toEqual([]);
  });
}
