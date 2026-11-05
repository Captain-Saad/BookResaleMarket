import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const API = "http://localhost:8000";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "*",
  "Access-Control-Allow-Headers": "*",
};

const ACCOUNT = {
  email: "reader@example.com",
  emailVerified: false,
  displayName: "Ada Reader",
  phone: null,
  status: "active",
  roles: ["buyer"],
  sellerVerification: "not_started",
};

const mockAccount = (page: Page) =>
  Promise.all([
    page.route(`${API}/api/v1/me`, (route) => route.fulfill({ json: ACCOUNT, headers: CORS })),
    page.route(`${API}/api/v1/me/addresses`, (route) => route.fulfill({ json: [], headers: CORS })),
  ]);

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
  { path: "/account", heading: "Profile" },
  { path: "/account/addresses", heading: "Addresses" },
  { path: "/account/seller", heading: "Selling" },
];

for (const { path, heading } of PAGES) {
  test(`${path} renders, fits the screen and passes axe`, async ({ page }) => {
    await mockAccount(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expectNoOverflow(page);
    await expectNoAxeViolations(page);
  });
}

test("the account page offers a retry when the API is down", async ({ page }) => {
  await page.route(`${API}/api/v1/me`, (route) => route.abort());
  await page.goto("/account");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
