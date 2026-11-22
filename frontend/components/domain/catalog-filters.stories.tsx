import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import CatalogFilters from "./catalog-filters";
import { CATALOG_COPY, EMPTY_CATALOG_FILTERS } from "@/lib/constants";
const meta = {
  title: "Catalog/Filters",
  component: CatalogFilters,
  args: {
    copy: CATALOG_COPY,
    filters: EMPTY_CATALOG_FILTERS,
    prefix: CATALOG_COPY.desktopPrefix,
    onSubmit: (event) => event.preventDefault(),
    onReset: () => {},
  },
  decorators: [
    (Story) => (
      <div className="glass glass--2 w-72 p-5">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CatalogFilters>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Empty: Story = {};
export const Selected: Story = {
  args: {
    filters: {
      ...EMPTY_CATALOG_FILTERS,
      condition: "good",
      currency: "USD",
      min_price: 500,
      max_price: 2000,
    },
  },
};
