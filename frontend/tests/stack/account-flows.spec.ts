import { execFileSync } from "node:child_process";
import { expect, type Page, test } from "@playwright/test";

const MAILPIT = "http://localhost:8025/api/v1";
const API = "http://localhost:8010/api/v1";
const PASSWORD = "a-good-password";
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/bookloop";

const uniqueEmail = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;

const findLink = async (email: string, path: string) => {
  const query = encodeURIComponent(`to:"${email}"`);
  const { messages } = await (await fetch(`${MAILPIT}/search?query=${query}`)).json();
  for (const { ID } of messages) {
    const { Text } = await (await fetch(`${MAILPIT}/message/${ID}`)).json();
    const match = Text.match(new RegExp(`http\\S*${path}\\?token=[\\w-]+`));
    if (match) return match[0] as string;
  }
  return "";
};

const latestLink = async (email: string, path: string) => {
  await expect.poll(() => findLink(email, path)).not.toBe("");
  return findLink(email, path);
};

const register = async (page: Page, email: string) => {
  await page.goto("/register");
  await page.getByLabel("Name").fill("Ada Reader");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email");
};

const signIn = async (page: Page, email: string, password = PASSWORD) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
};

test("register, verify, sign in, manage the account and sign out", async ({ page, context }) => {
  const email = uniqueEmail("reader");
  await register(page, email);

  await page.goto(await latestLink(email, "verify-email"));
  await expect(page.getByRole("status")).toContainText("Your email is verified");

  await signIn(page, email);
  await expect(page).toHaveURL("/account");
  await expect(page.getByText(email)).toBeVisible();

  const cookie = (await context.cookies()).find(({ name }) => name === "bookloop_session");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("bookloop_session");
  const stored = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(stored).not.toContain(cookie?.value ?? "missing");

  await page.getByLabel("Name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Name")).toHaveValue("Ada Lovelace");

  await page.goto("/account/addresses");
  await page.getByRole("button", { name: "Add address" }).click();
  await page.getByLabel("Recipient name").fill("Ada");
  await page.getByLabel("Address line 1").fill("1 Main St");
  await page.getByLabel("City").fill("Lahore");
  await page.getByLabel("State or region").fill("Punjab");
  await page.getByLabel("Postal code").fill("54000");
  await page.getByLabel("Country code").fill("pk");
  await page.getByRole("button", { name: "Save address" }).click();
  await expect(page.getByText("1 Main St")).toBeVisible();
  await expect(page.getByText(/PK$/)).toBeVisible();
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("You haven't added an address yet.")).toBeVisible();

  await page.goto("/account/seller");
  await page.getByRole("button", { name: "Become a seller" }).click();
  await page.getByRole("button", { name: "Start verification" }).click();
  await expect(page.getByText("In review")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/account");
  await expect(page).toHaveURL("/login?next=%2Faccount");

  await context.addCookies([cookie!]);
  await page.goto("/account");
  await expect(page).toHaveURL("/login?next=%2Faccount");
});

test("signing in returns to the page the visitor wanted", async ({ page }) => {
  const email = uniqueEmail("next");
  await register(page, email);
  await page.goto("/account/addresses");
  await expect(page).toHaveURL("/login?next=%2Faccount%2Faddresses");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account/addresses");
});

test("a sign-in link can't redirect to another site", async ({ page }) => {
  const email = uniqueEmail("redirect");
  await register(page, email);
  await page.goto("/login?next=https://evil.example");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/account");
});

test("wrong passwords show one message, and reset replaces the password", async ({ page }) => {
  const email = uniqueEmail("reset");
  await register(page, email);
  await signIn(page, email, "wrong-password");
  await expect(page.locator("main").getByRole("alert")).toContainText("don't match");

  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("reset link");

  await page.goto(await latestLink(email, "reset-password"));
  await page.getByLabel("Password").fill("a-new-password");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("status")).toContainText("password has been changed");

  await signIn(page, email);
  await expect(page.locator("main").getByRole("alert")).toContainText("don't match");
  await signIn(page, email, "a-new-password");
  await expect(page).toHaveURL("/account");
});

test("staff areas follow roles, and a suspended user is blocked at once", async ({
  page,
  browser,
}) => {
  const adminEmail = uniqueEmail("admin");
  await register(page, adminEmail);
  execFileSync("uv", ["run", "python", "-m", "scripts.grant_role", adminEmail, "admin"], {
    cwd: "../backend",
    env: { ...process.env, BOOKLOOP_ENV: "test", BOOKLOOP_DATABASE_DIRECT_URL: DATABASE_URL },
  });
  await signIn(page, adminEmail);
  await expect(page).toHaveURL("/account");
  await expect(page.getByRole("link", { name: "Admin" })).toBeVisible();
  await page.goto("/admin");
  await expect(page).toHaveURL("/admin");

  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  const baseURL = test.info().project.use.baseURL;
  const email = uniqueEmail("user");
  await userPage.goto(`${baseURL}/register`);
  await userPage.getByLabel("Name").fill("Sam");
  await userPage.getByLabel("Email").fill(email);
  await userPage.getByLabel("Password").fill(PASSWORD);
  await userPage.getByRole("button", { name: "Create account" }).click();
  await expect(userPage.getByRole("status")).toContainText("Check your email");
  await userPage.goto(`${baseURL}/login`);
  await userPage.getByLabel("Email").fill(email);
  await userPage.getByLabel("Password").fill(PASSWORD);
  await userPage.getByRole("button", { name: "Sign in" }).click();
  await expect(userPage).toHaveURL(`${baseURL}/account`);
  await expect(userPage.getByRole("link", { name: "Admin" })).toHaveCount(0);

  await userPage.goto(`${baseURL}/admin`);
  await expect(userPage).toHaveURL(`${baseURL}/`);
  const forbidden = await userContext.request.get(`${API}/admin/users`);
  expect(forbidden.status()).toBe(403);

  let cursor = "";
  let target: { id: string } | undefined;
  while (!target) {
    const page_ = await page.context().request.get(`${API}/admin/users?limit=100${cursor}`);
    const { items, nextCursor } = await page_.json();
    target = items.find((item: { email: string }) => item.email === email);
    if (!nextCursor) break;
    cursor = `&cursor=${nextCursor}`;
  }
  const suspended = await page.context().request.post(`${API}/admin/users/${target?.id}/suspend`);
  expect(suspended.ok()).toBe(true);

  const blocked = await userContext.request.get(`${API}/me`);
  expect(blocked.status()).toBe(403);
  expect((await blocked.json()).code).toBe("account_suspended");
  await userPage.goto(`${baseURL}/account`);
  await expect(userPage).toHaveURL(`${baseURL}/suspended`);
  await expect(userPage.getByRole("heading", { level: 1 })).toHaveText("Account suspended");
  await userContext.close();
});

test("a signed-in user changes their password and other devices are signed out", async ({
  page,
  browser,
}) => {
  const email = uniqueEmail("change");
  await register(page, email);
  await signIn(page, email);
  await expect(page).toHaveURL("/account");

  const otherDevice = await browser.newContext();
  const otherPage = await otherDevice.newPage();
  const baseURL = test.info().project.use.baseURL;
  await otherPage.goto(`${baseURL}/login`);
  await otherPage.getByLabel("Email").fill(email);
  await otherPage.getByLabel("Password").fill(PASSWORD);
  await otherPage.getByRole("button", { name: "Sign in" }).click();
  await expect(otherPage).toHaveURL(`${baseURL}/account`);

  await page.getByRole("link", { name: "Change password" }).click();
  await expect(page).toHaveURL("/reset-password");
  await page.getByLabel("Current password").fill("wrong-password");
  await page.getByLabel("New password").fill("a-new-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("current password");

  await page.getByLabel("Current password").fill(PASSWORD);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByRole("status")).toContainText("password has been changed");

  await page.goto("/account");
  await expect(page).toHaveURL("/account");
  await otherPage.goto(`${baseURL}/account`);
  await expect(otherPage).toHaveURL(/\/login/);
  await otherDevice.close();

  await page.getByRole("button", { name: "Sign out" }).click();
  await signIn(page, email);
  await expect(page.locator("main").getByRole("alert")).toContainText("don't match");
  await signIn(page, email, "a-new-password");
  await expect(page).toHaveURL("/account");
});
