import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ListingOverview from "./listing-overview";
import { mockPublicDetail } from "@/lib/api/mocks/catalog";
import { DETAIL_COPY } from "@/lib/constants";
const meta = {
  title: "Catalog/Listing detail",
  component: ListingOverview,
  args: { book: { ...mockPublicDetail(), status: "active", available: true }, copy: DETAIL_COPY },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof ListingOverview>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = {};
export const Reserved: Story = {
  args: { book: { ...mockPublicDetail(), status: "reserved", available: false } },
};
export const Sold: Story = {
  args: { book: { ...mockPublicDetail(), status: "sold", available: false } },
};
