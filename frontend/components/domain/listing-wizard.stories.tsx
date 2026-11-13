import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import ListingWizard from "./listing-wizard";
import { LISTING_COPY } from "@/lib/constants";
const meta = {
  title: "Listings/Wizard",
  component: ListingWizard,
  args: { copy: LISTING_COPY },
} satisfies Meta<typeof ListingWizard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const NewDraft: Story = {};
