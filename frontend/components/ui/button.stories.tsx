import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Plus } from "lucide-react";
import Button from "@/components/ui/button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  args: { children: "Publish listing" },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "select", options: ["sm", "md", "lg", "icon"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Danger: Story = { args: { variant: "danger", children: "Remove listing" } };
export const Loading: Story = { args: { loading: true, children: "Paying…" } };
export const Disabled: Story = { args: { disabled: true } };
export const Icon: Story = {
  args: { size: "icon", "aria-label": "Add book", children: <Plus aria-hidden="true" /> },
};
export const AsLink: Story = {
  args: { asChild: true, variant: "secondary", children: <a href="/sell">Sell a book</a> },
};
