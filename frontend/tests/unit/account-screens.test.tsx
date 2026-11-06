import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";
import AddressManager from "@/components/domain/address-manager";
import ProfileForm from "@/components/domain/profile-form";
import SellerPanel from "@/components/domain/seller-panel";
import { resetMockAccount } from "@/lib/api/mocks/handlers";
import {
  ADDRESS_MANAGER_COPY,
  API_BASE_URL,
  API_PATHS,
  PROFILE_FORM_COPY,
  SELLER_PANEL_COPY,
  VALIDATION,
} from "@/lib/constants";
import { server } from "../utils/msw";

beforeEach(() => {
  resetMockAccount();
});

describe("ProfileForm", () => {
  it("loads the profile and saves changes", async () => {
    render(<ProfileForm copy={PROFILE_FORM_COPY} />);
    const name = await screen.findByLabelText("Name");
    await waitFor(() => expect(name).toHaveValue("Ada Reader"));
    const user = userEvent.setup();
    await user.clear(name);
    await user.type(name, "Ada Lovelace");
    await user.click(screen.getByRole("button", { name: PROFILE_FORM_COPY.submitLabel }));
    expect(await screen.findByText(PROFILE_FORM_COPY.saved)).toBeInTheDocument();
    expect(name).toHaveValue("Ada Lovelace");
  });

  it("offers a retry when loading fails", async () => {
    server.use(http.get(`${API_BASE_URL}${API_PATHS.me}`, () => HttpResponse.error()));
    render(<ProfileForm copy={PROFILE_FORM_COPY} />);
    const retry = await screen.findByRole("button", { name: PROFILE_FORM_COPY.retry });
    server.resetHandlers();
    await userEvent.click(retry);
    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  });
});

describe("ProfileForm password link", () => {
  it("links to changing the password", async () => {
    render(<ProfileForm copy={PROFILE_FORM_COPY} />);
    expect(
      await screen.findByRole("link", { name: PROFILE_FORM_COPY.passwordLink.label }),
    ).toHaveAttribute("href", PROFILE_FORM_COPY.passwordLink.href);
  });
});

describe("AddressManager", () => {
  it("adds an address, then deletes it after confirming", async () => {
    render(<AddressManager copy={ADDRESS_MANAGER_COPY} />);
    expect(await screen.findByText(ADDRESS_MANAGER_COPY.empty)).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: ADDRESS_MANAGER_COPY.addLabel }));
    const dialog = await screen.findByRole("dialog");
    const values = {
      "Recipient name": "Ada",
      "Address line 1": "1 Main St",
      City: "Lahore",
      "State or region": "Punjab",
      "Postal code": "54000",
      "Country code": "PK",
    };
    for (const [label, value] of Object.entries(values)) {
      await user.type(within(dialog).getByLabelText(label), value);
    }
    await user.click(
      within(dialog).getByRole("button", { name: ADDRESS_MANAGER_COPY.submitLabel }),
    );
    expect(await screen.findByText("1 Main St")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: ADDRESS_MANAGER_COPY.deleteLabel }));
    const confirm = await screen.findByRole("dialog", { name: ADDRESS_MANAGER_COPY.deleteTitle });
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
    await user.click(
      within(confirm).getByRole("button", { name: ADDRESS_MANAGER_COPY.deleteLabel }),
    );
    expect(await screen.findByText(ADDRESS_MANAGER_COPY.empty)).toBeInTheDocument();
  });

  it("rejects an invalid country code", async () => {
    render(<AddressManager copy={ADDRESS_MANAGER_COPY} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: ADDRESS_MANAGER_COPY.addLabel }));
    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Country code"), "Pakistan");
    await user.click(
      within(dialog).getByRole("button", { name: ADDRESS_MANAGER_COPY.submitLabel }),
    );
    expect(await within(dialog).findByText(VALIDATION.country)).toBeInTheDocument();
  });
});

describe("SellerPanel", () => {
  it("moves from buyer to seller to verification in review", async () => {
    render(<SellerPanel copy={SELLER_PANEL_COPY} />);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: SELLER_PANEL_COPY.becomeLabel }));
    await user.click(await screen.findByRole("button", { name: SELLER_PANEL_COPY.startLabel }));
    expect(await screen.findByText(SELLER_PANEL_COPY.statuses.pending.badge)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: SELLER_PANEL_COPY.startLabel })).toBeNull();
  });
});
