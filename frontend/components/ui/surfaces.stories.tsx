import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Badge from "@/components/ui/badge";
import GlassCard from "@/components/ui/glass-card";

const meta = {
  title: "Primitives/Surfaces",
  component: GlassCard,
} satisfies Meta<typeof GlassCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const GlassTiers: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-3">
      {([1, 2, 3] as const).map((tier) => (
        <GlassCard key={tier} tier={tier} className="w-56">
          <p className="font-display text-h3 text-ink-1">Tier {tier}</p>
          <p className="text-sm text-ink-2">backdrop blur and fill grow with the tier</p>
        </GlassCard>
      ))}
    </div>
  ),
};

export const Flat: Story = {
  args: { tier: "flat", children: <p className="text-ink-1">No blur: for long lists</p> },
};

export const Badges: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Draft</Badge>
      <Badge tone="brand">Featured</Badge>
      <Badge tone="success">Like new</Badge>
      <Badge tone="warning">Reserved</Badge>
      <Badge tone="danger">Disputed</Badge>
      <Badge tone="info">Very good</Badge>
    </div>
  ),
};
