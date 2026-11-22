import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import BookGallery from "./book-gallery";
import { mockPublicDetail } from "@/lib/api/mocks/catalog";
import { DETAIL_COPY } from "@/lib/constants";
const meta = {
  title: "Catalog/Gallery",
  component: BookGallery,
  args: { book: mockPublicDetail(), copy: DETAIL_COPY },
  decorators: [
    (Story) => (
      <div className="w-[min(24rem,90vw)]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BookGallery>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Photos: Story = {};
export const MissingPhotos: Story = { args: { book: { ...mockPublicDetail(), photos: [] } } };
