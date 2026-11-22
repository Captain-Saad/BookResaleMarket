import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { delay, http, HttpResponse, type RequestHandler } from "msw";
import ListingDetail from "./listing-detail";
import { catalogBooks, catalogHandlers } from "@/lib/api/mocks/catalog";
import { API_BASE_URL, CATALOG_API, DETAIL_COPY } from "@/lib/constants";
const load = async (handler?: RequestHandler) => {
  const { worker } = await import("@/lib/api/mocks/browser");
  worker.resetHandlers(...catalogHandlers);
  if (handler) worker.use(handler);
  await worker.start({ onUnhandledFrame: "bypass", quiet: true });
  return {};
};
const meta = {
  title: "Catalog/Detail loading",
  component: ListingDetail,
  args: { id: catalogBooks[1]!.id, copy: DETAIL_COPY },
  parameters: { layout: "fullscreen" },
  loaders: [() => load()],
} satisfies Meta<typeof ListingDetail>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Loaded: Story = {};
export const Loading: Story = {
  loaders: [
    () =>
      load(
        http.get(`${API_BASE_URL}${CATALOG_API}/:id`, async () => {
          await delay("infinite");
        }),
      ),
  ],
};
export const Error: Story = {
  loaders: [
    () =>
      load(
        http.get(`${API_BASE_URL}${CATALOG_API}/:id`, () => HttpResponse.json({}, { status: 503 })),
      ),
  ],
};
export const Missing: Story = {
  loaders: [
    () =>
      load(
        http.get(`${API_BASE_URL}${CATALOG_API}/:id`, () => HttpResponse.json({}, { status: 404 })),
      ),
  ],
};
