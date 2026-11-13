import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: "bookloop_session", value: "test", url: baseURL }]);
});

test("seller wizard supports manual entry and retains earlier steps", async ({ page }) => {
  await page.goto("/sell");
  await page.getByLabel("Book title", { exact: true }).fill("The Dispossessed");
  await page.getByLabel("Author", { exact: true }).fill("Ursula K. Le Guin");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByLabel("Condition", { exact: true })).toBeVisible();
  await page.getByLabel("Condition notes", { exact: true }).fill("A little shelf wear.");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByLabel("Book title", { exact: true })).toHaveValue("The Dispossessed");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
});
