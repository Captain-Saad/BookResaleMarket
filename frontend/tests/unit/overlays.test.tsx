import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Button from "@/components/ui/button";
import Drawer from "@/components/ui/drawer";
import Modal from "@/components/ui/modal";
import Toast, { ToastProvider } from "@/components/ui/toast";
import Tooltip from "@/components/ui/tooltip";
import { OVERLAY_LABELS } from "@/lib/constants";
import { axeViolations } from "../utils/axe";

describe("Modal", () => {
  const renderModal = () =>
    render(
      <Modal
        trigger={<Button>Remove listing</Button>}
        title="Remove this listing?"
        description="Buyers will no longer see it."
        closeLabel={OVERLAY_LABELS.close}
      >
        <Button variant="danger">Remove</Button>
      </Modal>,
    );

  it("opens from its trigger, closes with Escape and returns focus", async () => {
    const user = userEvent.setup();
    renderModal();
    const trigger = screen.getByRole("button", { name: "Remove listing" });
    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Remove this listing?" });
    expect(dialog).toHaveAccessibleDescription("Buyers will no longer see it.");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("has no axe violations when open", async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByRole("button", { name: "Remove listing" }));
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("Drawer", () => {
  it("opens as a dialog and closes from its close button", async () => {
    const user = userEvent.setup();
    render(
      <Drawer
        trigger={<Button>Filters</Button>}
        title="Filters"
        closeLabel={OVERLAY_LABELS.close}
        side="bottom"
      >
        <p>Condition</p>
      </Drawer>,
    );
    await user.click(screen.getByRole("button", { name: "Filters" }));
    expect(screen.getByRole("dialog", { name: "Filters" })).toHaveTextContent("Condition");
    await user.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("Toast", () => {
  it("is announced to assistive technology", async () => {
    render(
      <ToastProvider>
        <Toast
          open
          title="Listing published"
          description="Buyers can now find it."
          dismissLabel={OVERLAY_LABELS.dismiss}
        />
      </ToastProvider>,
    );
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Listing published"));
  });
});

describe("Tooltip", () => {
  it("opens on keyboard focus, not only on hover", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip content="Inspected at our warehouse">
        <Button variant="ghost">Verified</Button>
      </Tooltip>,
    );
    await user.tab();
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Inspected at our warehouse");
  });
});
