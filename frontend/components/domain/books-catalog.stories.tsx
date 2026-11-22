import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, http, HttpResponse } from "msw";
import BooksCatalog from "./books-catalog";
import { catalogHandlers } from "@/lib/api/mocks/catalog";
import { API_BASE_URL, CATALOG_API, CATALOG_COPY } from "@/lib/constants";
const load = async (mode = "ready") => {
  const { worker } = await import("@/lib/api/mocks/browser");
  worker.resetHandlers(...catalogHandlers);
  if (mode === "empty")
    worker.use(
      http.get(`${API_BASE_URL}${CATALOG_API}`, () =>
        HttpResponse.json({ items: [], nextCursor: null }),
      ),
    );
  if (mode === "error")
    worker.use(
      http.get(`${API_BASE_URL}${CATALOG_API}`, () => HttpResponse.json({}, { status: 503 })),
    );
  if (mode === "loading")
    worker.use(
      http.get(`${API_BASE_URL}${CATALOG_API}`, async () => {
        await delay("infinite");
      }),
    );
  await worker.start({ onUnhandledFrame: "bypass", quiet: true });
  return {};
};
const meta = {
  title: "Catalog/Books",
  component: BooksCatalog,
  args: { copy: CATALOG_COPY },
  parameters: { layout: "fullscreen" },
  loaders: [() => load()],
} satisfies Meta<typeof BooksCatalog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Results: Story = {};
export const Empty: Story = { loaders: [() => load("empty")] };
export const Error: Story = { loaders: [() => load("error")] };
export const Loading: Story = { loaders: [() => load("loading")] };
