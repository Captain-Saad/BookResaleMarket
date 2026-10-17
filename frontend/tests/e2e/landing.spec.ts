import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("landing page", () => {
  test("renders the hero, shelves and steps", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Buy and sell used books");
    await expect(page.getByRole("heading", { name: "Featured shelves" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  });

  test("has no horizontal page scroll", async ({ page }) => {
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBe(0);
  });

  test("theme toggle switches and remembers the theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-theme", "dark");

    const toggle = page.getByRole("button", { name: "Toggle color theme" });
    await expect(async () => {
      if ((await html.getAttribute("data-theme")) === "dark") await toggle.click();
      await expect(html).toHaveAttribute("data-theme", "light", { timeout: 1_000 });
    }).toPass();

    await page.reload();
    await expect(html).toHaveAttribute("data-theme", "light");
  });

  for (const colorScheme of ["dark", "light"] as const) {
    test(`has no WCAG A/AA violations (${colorScheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});
