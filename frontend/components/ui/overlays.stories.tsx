import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import Button from "@/components/ui/button";
import Drawer from "@/components/ui/drawer";
import Modal from "@/components/ui/modal";
import Toast, { ToastProvider } from "@/components/ui/toast";
import Tooltip from "@/components/ui/tooltip";
import { OVERLAY_LABELS } from "@/lib/constants";
import { ToastTone } from "@/lib/types";

const meta = {
  title: "Primitives/Overlays",
  component: Modal,
  args: { title: "Remove this listing?", closeLabel: OVERLAY_LABELS.close },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfirmModal: Story = {
  args: {
    trigger: <Button variant="secondary">Remove listing</Button>,
    description: "Buyers will no longer see it. You can list it again later.",
    children: (
      <div className="flex justify-end gap-2">
        <Button variant="ghost">Cancel</Button>
        <Button variant="danger">Remove</Button>
      </div>
    ),
  },
};

export const SideDrawer: Story = {
  render: () => (
    <Drawer
      trigger={<Button variant="secondary">Filters</Button>}
      title="Filters"
      closeLabel={OVERLAY_LABELS.close}
    >
      <p className="text-ink-2">Condition, price and delivery filters go here.</p>
    </Drawer>
  ),
};

export const BottomSheet: Story = {
  render: () => (
    <Drawer
      trigger={<Button variant="secondary">Sort</Button>}
      title="Sort by"
      closeLabel={OVERLAY_LABELS.close}
      side="bottom"
    >
      <p className="text-ink-2">Newest, price low to high, price high to low.</p>
    </Drawer>
  ),
};

const ToastDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <ToastProvider>
      <Button onClick={() => setOpen(true)}>Publish</Button>
      <Toast
        open={open}
        onOpenChange={setOpen}
        tone={ToastTone.Success}
        title="Listing published"
        dismissLabel={OVERLAY_LABELS.dismiss}
        description="Buyers can now find it."
      />
    </ToastProvider>
  );
};

export const Toasts: Story = { render: () => <ToastDemo /> };

export const Tooltips: Story = {
  render: () => (
    <Tooltip content="Inspected at our warehouse">
      <Button variant="ghost">Verified condition</Button>
    </Tooltip>
  ),
};
