import { listingHandlers, resetMockListings } from "@/lib/api/mocks/listings";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ListingWizard from "./listing-wizard";
import { LISTING_COPY } from "@/lib/constants";
const meta = {
  title: "Listings/Wizard",
  component: ListingWizard,
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
} satisfies Meta<typeof ListingWizard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NewDraft: Story = {};

export const PublishedIdentityLocked: Story = {
  args: {
    initial: {
      id: "01900000-0000-7000-8000-000000000001",
      isbn: "9780441478125",
      title: "The Left Hand of Darkness",
      author: "Ursula K. Le Guin",
      condition: "good",
      notes: "Light shelf wear.",
      fulfillment: "on_demand",
      priceMinor: 1200,
      currency: "USD",
      addressId: null,
      status: "active",
      version: 2,
      identityLocked: true,
      purchaseLocked: false,
      returnOrDonationPending: false,
      photos: [],
      createdAt: "2026-11-13T00:00:00Z",
      updatedAt: "2026-11-13T00:00:00Z",
    },
  },
};
export const CommittedToBuyer: Story = {
  args: {
    initial: {
      ...PublishedIdentityLocked.args!.initial!,
      status: "reserved",
      purchaseLocked: true,
    },
  },
};
