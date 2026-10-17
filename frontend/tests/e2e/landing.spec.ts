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

const PLACEHOLDER_ROUTES = [
  { path: "/search", heading: "Search" },
  { path: "/login", heading: "Sign in" },
  { path: "/orders", heading: "Your orders" },
  { path: "/sell", heading: "Sell a book" },
  { path: "/warehouse", heading: "Warehouse console" },
  { path: "/courier", heading: "Courier app" },
  { path: "/admin", heading: "Admin console" },
];

test.describe("navigation", () => {
  test("shows the right navigation for the screen size", async ({ page }) => {
    await page.goto("/search");
    const width = page.viewportSize()?.width ?? 0;
    const mainNav = page.getByRole("navigation", { name: "Main" });
    const menuButton = page.getByRole("button", { name: "Open menu" });

    if (width < 768) {
      await expect(mainNav).toHaveCount(1);
      await expect(mainNav).toHaveCSS("position", "fixed");
      await expect(mainNav.getByRole("link", { name: "Browse" })).toHaveAttribute(
        "aria-current",
        "page",
      );
      await expect(menuButton).toBeHidden();
    } else if (width < 1024) {
      await expect(mainNav).toHaveCount(0);
      await expect(menuButton).toBeVisible();
    } else {
      await expect(mainNav).toHaveCount(1);
      await expect(mainNav.getByRole("link", { name: "Sell" })).toBeVisible();
      await expect(menuButton).toBeHidden();
    }
  });

  test("drawer opens, closes with Escape and returns focus", async ({ page }) => {
    const width = page.viewportSize()?.width ?? 0;
    test.skip(width < 768 || width >= 1024, "the drawer exists only at tablet widths");
    await page.goto("/");
    const menuButton = page.getByRole("button", { name: "Open menu" });
    const drawer = page.getByRole("dialog", { name: "Menu" });

    await expect(async () => {
      await menuButton.click();
      await expect(drawer).toBeVisible({ timeout: 1_000 });
    }).toPass();
    await expect(drawer.getByRole("link", { name: "Orders" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(drawer).toBeHidden();
    await expect(menuButton).toBeFocused();
  });

  test("unknown URLs show the not-found page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  for (const { path, heading } of PLACEHOLDER_ROUTES) {
    test(`placeholder ${path} renders and passes axe`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page).toHaveTitle(`${heading} · BookLoop`);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test("the dev test console is not part of production builds", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open dev test console" })).toHaveCount(0);
});
