import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import MyListings from "./my-listings";
import { LISTING_COPY } from "@/lib/constants";
const meta = {
  title: "Listings/My listings",
  component: MyListings,
  args: { copy: LISTING_COPY },
} satisfies Meta<typeof MyListings>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Overview: Story = {};
