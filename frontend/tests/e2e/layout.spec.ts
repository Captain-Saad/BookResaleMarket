import { expect, type Page, test } from "@playwright/test";

const API = "http://127.0.0.1:59999";
const CORS = {
  "Access-Control-Allow-Origin": "http://localhost:3100",
  "Access-Control-Allow-Credentials": "true",
};
const ACCOUNT = {
  email: "reader@example.com",
  emailVerified: true,
  displayName: "Ada Reader",
  phone: null,
  status: "active",
  roles: ["buyer"],
  sellerVerification: "not_started",
};

const PAGES = [
  "/",
  "/books",
  "/orders",
  "/sell",
  "/warehouse",
  "/courier",
  "/admin",
  "/account",
  "/account/addresses",
  "/account/seller",
  "/not-a-real-page",
];
const SHORT_PAGES = PAGES.filter((path) => path !== "/");
const TOLERANCE = 1;
const TAB_BAR_SPACE = 96;
const FOOTER_SPACE = 24;

test.beforeEach(async ({ context, page, baseURL }) => {
  await context.addCookies([{ name: "bookloop_session", value: "test", url: baseURL }]);
  await page.route(`${API}/api/v1/me`, (route) => route.fulfill({ json: ACCOUNT, headers: CORS }));
  await page.route(`${API}/api/v1/me/addresses`, (route) =>
    route.fulfill({ json: [], headers: CORS }),
  );
});

const widthOf = async (page: Page, selector: string) => {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).not.toBeNull();
  return box!;
};

for (const path of PAGES) {
  test(`${path} content lines up with the header and footer`, async ({ page }) => {
    await page.goto(path);
    const header = await widthOf(page, "header .glass");
    const footer = await widthOf(page, "footer .glass");
    const content = await widthOf(page, "main .glass");
    expect(Math.abs(footer.width - header.width)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(content.width - header.width)).toBeLessThanOrEqual(TOLERANCE);
    expect(Math.abs(content.x - header.x)).toBeLessThanOrEqual(TOLERANCE);
  });
}

for (const path of SHORT_PAGES) {
  test(`${path} keeps the footer at the bottom of the screen`, async ({ page, viewport }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const { footerBottom, pageHeight } = await page.evaluate(() => {
      const box = document.querySelector("footer .glass")?.getBoundingClientRect();
      return {
        footerBottom: (box?.bottom ?? 0) + scrollY,
        pageHeight: document.documentElement.scrollHeight,
      };
    });
    const reserved = (viewport?.width ?? 0) < 768 ? TAB_BAR_SPACE + FOOTER_SPACE : FOOTER_SPACE;
    expect(pageHeight - footerBottom).toBeLessThanOrEqual(reserved + TOLERANCE);
    expect(pageHeight).toBeGreaterThanOrEqual(viewport?.height ?? 0);
  });
}

test("auth pages keep their narrower card on purpose", async ({ page }) => {
  await page.goto("/login");
  const card = await widthOf(page, "main .glass");
  expect(card.width).toBeLessThanOrEqual(448 + TOLERANCE);
});

test("the hero fills the first screen, and the next section starts below it", async ({
  page,
  viewport,
}) => {
  await page.goto("/");
  const hero = await widthOf(page, "main .glass");
  const nextSection = await widthOf(page, "#shelves");
  const screenHeight = viewport?.height ?? 0;
  expect(nextSection.y).toBeGreaterThanOrEqual(screenHeight);
  expect(hero.y + hero.height).toBeLessThanOrEqual(screenHeight);
});
