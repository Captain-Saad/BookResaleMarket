import { listingHandlers, resetMockListings } from "@/lib/api/mocks/listings";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MyListings from "./my-listings";
import { LISTING_COPY } from "@/lib/constants";
const meta = {
  title: "Listings/My listings",
  component: MyListings,
  args: { copy: LISTING_COPY },
  loaders: [
    async () => {
      const { worker } = await import("@/lib/api/mocks/browser");
      resetMockListings();
      worker.resetHandlers(...listingHandlers);
      await worker.start({ onUnhandledFrame: "bypass", quiet: true });
      return {};
    },
  ],
} satisfies Meta<typeof MyListings>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = {};
