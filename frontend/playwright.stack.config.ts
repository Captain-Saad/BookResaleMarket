import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = 3200;
const API_PORT = 8010;
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:55432/bookloop";

const VIEWPORTS = [
  { name: "phone-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 900 },
];

export default defineConfig({
  testDir: "./tests/stack",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${WEB_PORT}`, trace: "on-first-retry" },
  projects: VIEWPORTS.map(({ name, width, height }) => ({
    name,
    use: { ...devices["Desktop Chrome"], viewport: { width, height } },
  })),
  webServer: [
    {
      command: `uv run alembic upgrade head && uv run uvicorn app.main:create_app --factory --port ${API_PORT}`,
      cwd: "../backend",
      url: `http://localhost:${API_PORT}/healthz`,
      timeout: 120_000,
      env: {
        BOOKLOOP_ENV: "test",
        BOOKLOOP_REDIS_URL: "",
        BOOKLOOP_DATABASE_URL: DATABASE_URL,
        BOOKLOOP_DATABASE_DIRECT_URL: DATABASE_URL,
        BOOKLOOP_CORS_ORIGINS: `["http://localhost:${WEB_PORT}"]`,
        BOOKLOOP_FRONTEND_BASE_URL: `http://localhost:${WEB_PORT}`,
      },
    },
    {
      command: `pnpm build && pnpm start --port ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 180_000,
      env: { NEXT_PUBLIC_API_BASE_URL: `http://localhost:${API_PORT}` },
    },
  ],
});
