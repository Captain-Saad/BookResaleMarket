import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import TestConsole from "@/components/dev/test-console";
import { API_BASE_URL } from "@/lib/constants";
import { axeViolations } from "../utils/axe";

const openConsole = async () => {
  const user = userEvent.setup();
  render(<TestConsole />);
  await user.click(screen.getByRole("button", { name: "Open dev test console" }));
  return user;
};

describe("TestConsole", () => {
  it("shows the environment", async () => {
    await openConsole();
    const dialog = screen.getByRole("dialog", { name: "Dev test console" });
    expect(dialog).toHaveTextContent(API_BASE_URL);
    expect(dialog).toHaveTextContent("local");
  });

  it("calls the health endpoint and lists its request ID", async () => {
    const user = await openConsole();
    await user.click(screen.getByRole("button", { name: "Check health" }));
    expect(await screen.findByText(/"status": "ok"/)).toBeInTheDocument();
    const ids = screen.getByRole("region", { name: "Recent request IDs" });
    expect(ids.querySelectorAll("li")).not.toHaveLength(0);
  });

  it("switches role through the dev session endpoint", async () => {
    const user = await openConsole();
    await user.click(screen.getByRole("combobox", { name: "Act as" }));
    await user.click(await screen.findByRole("option", { name: "Courier" }));
    await user.click(screen.getByRole("button", { name: "Switch role" }));
    expect(await screen.findByText(/"role": "courier"/)).toBeInTheDocument();
  });

  it("has no axe violations when open", async () => {
    await openConsole();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});
