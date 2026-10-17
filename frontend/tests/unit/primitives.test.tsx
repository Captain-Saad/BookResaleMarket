import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Checkbox from "@/components/ui/checkbox";
import GlassCard from "@/components/ui/glass-card";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Switch from "@/components/ui/switch";
import Textarea from "@/components/ui/textarea";
import { axeViolations } from "../utils/axe";

describe("Button", () => {
  it("calls onClick and defaults to type=button", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Pay
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Pay" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders its child element with asChild", () => {
    render(
      <Button asChild variant="secondary">
        <a href="/sell">Sell</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Sell" })).toHaveClass("glass");
  });
});

describe("GlassCard and Badge", () => {
  it("apply the glass tier and badge tone", () => {
    render(
      <GlassCard tier={3}>
        <Badge tone="success">Like new</Badge>
      </GlassCard>,
    );
    expect(screen.getByText("Like new").parentElement).toHaveClass("glass", "glass--3");
    expect(screen.getByText("Like new")).toHaveClass("bg-success/15");
  });
});

describe("form controls", () => {
  const Form = () => (
    <form>
      <label htmlFor="title">Title</label>
      <Input id="title" />
      <label htmlFor="notes">Notes</label>
      <Textarea id="notes" />
      <label htmlFor="grade">Condition</label>
      <Select
        id="grade"
        placeholder="Choose a grade"
        options={[
          { value: "new", label: "New" },
          { value: "good", label: "Good" },
        ]}
      />
      <Checkbox id="terms" />
      <label htmlFor="terms">I accept the terms</label>
      <Switch id="notify" />
      <label htmlFor="notify">Email me</label>
    </form>
  );

  it("are reachable by their labels", () => {
    render(<Form />);
    expect(screen.getByRole("textbox", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Condition" })).toHaveTextContent("Choose a grade");
    expect(screen.getByRole("checkbox", { name: "I accept the terms" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Email me" })).not.toBeChecked();
  });

  it("toggle with the keyboard", async () => {
    const user = userEvent.setup();
    render(<Form />);
    const checkbox = screen.getByRole("checkbox", { name: "I accept the terms" });
    checkbox.focus();
    await user.keyboard(" ");
    expect(checkbox).toBeChecked();
    const toggle = screen.getByRole("switch", { name: "Email me" });
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toBeChecked();
  });

  it("selects an option", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <>
        <label htmlFor="grade">Condition</label>
        <Select
          id="grade"
          onValueChange={onValueChange}
          options={[
            { value: "new", label: "New" },
            { value: "good", label: "Good" },
          ]}
        />
      </>,
    );
    await user.click(screen.getByRole("combobox", { name: "Condition" }));
    await user.click(await screen.findByRole("option", { name: "Good" }));
    expect(onValueChange).toHaveBeenCalledWith("good");
  });

  it("have no axe violations", async () => {
    const { container } = render(<Form />);
    expect(await axeViolations(container)).toEqual([]);
  });

  it("mark invalid fields for assistive technology", () => {
    render(
      <>
        <label htmlFor="isbn">ISBN</label>
        <Input id="isbn" aria-invalid />
      </>,
    );
    expect(screen.getByRole("textbox", { name: "ISBN" })).toBeInvalid();
  });
});

describe("cn", () => {
  it("keeps custom font sizes next to colours and resolves real conflicts", async () => {
    const { cn } = await import("@/lib/utils");
    expect(cn("text-h3 text-ink-1")).toBe("text-h3 text-ink-1");
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});
