import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BookPurchaseCard from "./book-purchase-card";
import { mockPublicDetail } from "@/lib/api/mocks/catalog";
import { DETAIL_COPY } from "@/lib/constants";
const meta = {
  title: "Catalog/Purchase card",
  component: BookPurchaseCard,
  args: { book: { ...mockPublicDetail(), status: "active", available: true }, copy: DETAIL_COPY },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookPurchaseCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Available: Story = {};
export const Incoming: Story = { args: { book: mockPublicDetail() } };
export const Reserved: Story = {
  args: { book: { ...mockPublicDetail(), status: "reserved", available: false } },
};
export const Sold: Story = {
  args: { book: { ...mockPublicDetail(), status: "sold", available: false } },
};
export const MobileBar: Story = { args: { compact: true } };
