import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mockCatalogPage } from "@/lib/api/mocks/catalog";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/listings**", (route) =>
    route.fulfill({ json: mockCatalogPage(new URL(route.request().url()).searchParams) }),
  );
});
test("catalog combines search and responsive filters", async ({ page }) => {
  await page.goto("/books");
  await expect(
    page.getByRole("link", { name: "View book: Frankenstein", exact: true }),
  ).toBeVisible();
  const mobile = (page.viewportSize()?.width ?? 0) < 1024;
  if (mobile) await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = mobile ? page.getByRole("dialog") : page.locator("aside");
  await filters.getByRole("combobox", { name: "Condition", exact: true }).selectOption("very_good");
  await filters
    .getByRole("combobox", { name: "Fulfillment", exact: true })
    .selectOption("warehouse");
  await filters.getByLabel("Maximum price").fill("10.00");
  if (mobile) {
    await filters.getByRole("button", { name: "Apply filters" }).click();
    await expect(filters.getByRole("alert")).toContainText("choose a currency");
  }
  await filters.getByRole("combobox", { name: "Currency", exact: true }).selectOption("EUR");
  await filters.getByRole("button", { name: "Apply filters" }).click();
  await expect(
    page.getByRole("link", { name: "View book: Frankenstein", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /View book: The Dispossessed/ })).toHaveCount(0);
  if (mobile) {
    const trigger = page.getByRole("button", { name: "Filters", exact: true });
    await expect(trigger).toBeFocused();
    await trigger.click();
  }
  await filters.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("link", { name: /View book: The Dispossessed/ })).toBeVisible();
  await page.getByLabel("Title, author or words from a book").fill("Dispossessed");
  await page.getByRole("button", { name: "Search books", exact: true }).click();
  await expect(page.getByRole("link", { name: /View book: Frankenstein/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const colorScheme of ["dark", "light"] as const) {
  test(`catalog has accessible ${colorScheme} surfaces`, async ({ page }, info) => {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/books");
    await expect(
      page.getByRole("link", { name: "View book: Frankenstein", exact: true }),
    ).toBeVisible();
    expect(
      (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag22aa"]).analyze())
        .violations,
    ).toEqual([]);
    if ((page.viewportSize()?.width ?? 0) < 1024) {
      await page.getByRole("button", { name: "Filters", exact: true }).click();
      expect(
        (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
      ).toEqual([]);
      await page.keyboard.press("Escape");
    }
    const path = info.outputPath(`catalog-${colorScheme}.png`);
    await page.screenshot({ path, fullPage: true });
    await info.attach(`catalog-${colorScheme}`, { path, contentType: "image/png" });
  });
}
