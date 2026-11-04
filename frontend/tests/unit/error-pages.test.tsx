import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "@/app/error";
import Loading from "@/app/loading";
import { ERROR_PAGE, LOADING_LABEL } from "@/lib/constants";

describe("ErrorPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("announces the error, logs it and retries", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const retry = vi.fn();
    const error = new Error("boom");
    render(<ErrorPage error={error} retry={retry} />);
    expect(screen.getByRole("alert")).toHaveTextContent(ERROR_PAGE.title);
    expect(log).toHaveBeenCalledWith(error);
    await userEvent.click(screen.getByRole("button", { name: ERROR_PAGE.retryLabel }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe("Loading", () => {
  it("is announced to assistive technology", () => {
    render(<Loading />);
    expect(screen.getByRole("status")).toHaveTextContent(LOADING_LABEL);
  });
});
