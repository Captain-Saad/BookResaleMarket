import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const API = "http://127.0.0.1:59999";
const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
};

const expectNoAxeViolations = async (page: Page) => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(violations).toEqual([]);
};

const expectNoOverflow = async (page: Page) => {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
};

const PAGES = [
  { path: "/login", heading: "Sign in" },
  { path: "/register", heading: "Create your account" },
  { path: "/forgot-password", heading: "Reset your password" },
  { path: "/reset-password", heading: "Reset link missing" },
  { path: "/reset-password?token=abc", heading: "Choose a new password" },
  { path: "/verify-email", heading: "Verify your email" },
  { path: "/suspended", heading: "Account suspended" },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders, fits the screen and passes axe`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expectNoOverflow(page);
    await expectNoAxeViolations(page);
  });
}

test("login shows validation errors without calling the API", async ({ page }) => {
  let calls = 0;
  await page.route(`${API}/api/v1/auth/login`, (route) => {
    calls += 1;
    return route.fulfill({ status: 204, headers: CORS });
  });
  await page.goto("/login");
  await page.locator("main button[type=submit]").click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  expect(calls).toBe(0);
});

test("registering asks the user to check their email", async ({ page }) => {
  await page.route(`${API}/api/v1/auth/register`, (route) =>
    route.fulfill({ status: 202, headers: CORS }),
  );
  await page.goto("/register");
  await page.getByLabel("Name").fill("Ada");
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByLabel("Password").fill("a-good-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
});

for (const path of ["/account", "/orders", "/sell", "/warehouse", "/courier", "/admin"]) {
  test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });
}

test("pages send security headers", async ({ page }) => {
  const response = await page.goto("/login");
  const headers = response?.headers() ?? {};
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["x-powered-by"]).toBeUndefined();
});
