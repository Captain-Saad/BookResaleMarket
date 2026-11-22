import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BookCard from "./book-card";
import { catalogBooks } from "@/lib/api/mocks/catalog";
import { CATALOG_COPY } from "@/lib/constants";
const meta = {
  title: "Catalog/Book card",
  component: BookCard,
  args: { book: catalogBooks[0]!, copy: CATALOG_COPY },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Active: Story = {};
export const Incoming: Story = { args: { book: catalogBooks[1]! } };
