import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthForm from "@/components/domain/auth-form";
import VerifyEmailStatus from "@/components/domain/verify-email-status";
import {
  API_BASE_URL,
  API_PATHS,
  AUTH_ERROR_MESSAGES,
  AUTH_FORMS,
  ROUTES,
  VALIDATION,
  VERIFY_EMAIL_COPY,
} from "@/lib/constants";
import { AuthFormId, VerifyEmailStatus as Status } from "@/lib/types";
import { axeViolations } from "../utils/axe";
import { server } from "../utils/msw";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: () => {} }),
  usePathname: () => "/",
}));

const renderLogin = () =>
  render(
    <AuthForm
      formId={AuthFormId.Login}
      copy={AUTH_FORMS[AuthFormId.Login]}
      errorMessages={AUTH_ERROR_MESSAGES}
      successHref={ROUTES.account}
      suspendedHref={ROUTES.suspended}
    />,
  );

const signIn = async (email: string, password: string) => {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), email);
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Sign in" }));
};

beforeEach(() => {
  push.mockClear();
});

describe("AuthForm", () => {
  it("shows field errors and sends nothing when the form is invalid", async () => {
    const seen = vi.fn();
    server.events.on("request:start", seen);
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(VALIDATION.email)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(seen).not.toHaveBeenCalled();
    server.events.removeAllListeners();
  });

  it("goes to the account page after signing in", async () => {
    renderLogin();
    await signIn("reader@example.com", "a-good-password");
    await waitFor(() => expect(push).toHaveBeenCalledWith(ROUTES.account));
  });

  it("shows the API's error for wrong credentials", async () => {
    renderLogin();
    await signIn("reader@example.com", "wrong-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      AUTH_ERROR_MESSAGES.invalid_credentials,
    );
    expect(push).not.toHaveBeenCalled();
  });

  it("sends a suspended user to the suspended page", async () => {
    renderLogin();
    await signIn("suspended@example.com", "a-good-password");
    await waitFor(() => expect(push).toHaveBeenCalledWith(ROUTES.suspended));
  });

  it("shows a general error when the network fails", async () => {
    server.use(http.post(`${API_BASE_URL}${API_PATHS.login}`, () => HttpResponse.error()));
    renderLogin();
    await signIn("reader@example.com", "a-good-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(AUTH_ERROR_MESSAGES.default);
  });

  const renderRegister = () =>
    render(
      <AuthForm
        formId={AuthFormId.Register}
        copy={AUTH_FORMS[AuthFormId.Register]}
        errorMessages={AUTH_ERROR_MESSAGES}
      />,
    );

  const fillRegister = async (email: string, password: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Name"), "Ada");
    await user.type(screen.getByLabelText("Email"), email);
    await user.type(screen.getByLabelText("Password"), password);
    await user.click(screen.getByRole("button", { name: "Create account" }));
  };

  it("asks a new user to check their email", async () => {
    renderRegister();
    await fillRegister("new@example.com", "a-good-password");
    expect(await screen.findByRole("status")).toHaveTextContent(
      AUTH_FORMS[AuthFormId.Register].successMessage,
    );
  });

  it("rejects a password over 72 bytes, counting bytes and not characters", async () => {
    renderRegister();
    await fillRegister("new@example.com", "é".repeat(37));
    expect(await screen.findByText(VALIDATION.passwordTooLong)).toBeInTheDocument();
  });

  it("sends the reset token with the new password", async () => {
    let body: unknown;
    server.use(
      http.post(`${API_BASE_URL}${API_PATHS.resetPassword}`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    render(
      <AuthForm
        formId={AuthFormId.ResetPassword}
        copy={AUTH_FORMS[AuthFormId.ResetPassword]}
        errorMessages={AUTH_ERROR_MESSAGES}
        token="valid-token"
      />,
    );
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Password"), "a-new-password");
    await user.click(screen.getByRole("button", { name: "Save new password" }));
    await screen.findByRole("status");
    expect(body).toEqual({ password: "a-new-password", token: "valid-token" });
  });

  it("has no axe violations", async () => {
    renderLogin();
    expect(await axeViolations(document.body)).toEqual([]);
  });
});

describe("Change password", () => {
  const renderChange = () =>
    render(
      <AuthForm
        formId={AuthFormId.ChangePassword}
        copy={AUTH_FORMS[AuthFormId.ChangePassword]}
        errorMessages={AUTH_ERROR_MESSAGES}
      />,
    );

  const submit = async (current: string, next: string) => {
    const user = userEvent.setup();
    await user.type(screen.getByLabelText("Current password"), current);
    await user.type(screen.getByLabelText("New password"), next);
    await user.click(screen.getByRole("button", { name: "Change password" }));
  };

  it("sends the current and new passwords", async () => {
    let body: unknown;
    server.use(
      http.post(`${API_BASE_URL}${API_PATHS.changePassword}`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    renderChange();
    await submit("a-good-password", "a-new-password");
    expect(await screen.findByRole("status")).toHaveTextContent(
      AUTH_FORMS[AuthFormId.ChangePassword].successMessage,
    );
    expect(body).toEqual({ currentPassword: "a-good-password", newPassword: "a-new-password" });
  });

  it("explains a wrong current password", async () => {
    renderChange();
    await submit("wrong-password", "a-new-password");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      AUTH_ERROR_MESSAGES.invalid_current_password,
    );
  });

  it("applies the usual rules to the new password", async () => {
    renderChange();
    await submit("a-good-password", "short");
    expect(await screen.findByText(VALIDATION.passwordTooShort)).toBeInTheDocument();
  });
});

describe("VerifyEmailStatus", () => {
  it("submits a single-use token only once, even in Strict Mode", async () => {
    const seen = vi.fn(() => new HttpResponse(null, { status: 204 }));
    server.use(http.post(`${API_BASE_URL}${API_PATHS.verifyEmail}`, seen));
    render(
      <StrictMode>
        <VerifyEmailStatus token="valid-token" copy={VERIFY_EMAIL_COPY} />
      </StrictMode>,
    );
    expect(await screen.findByText(VERIFY_EMAIL_COPY[Status.Verified])).toBeInTheDocument();
    expect(seen).toHaveBeenCalledOnce();
  });

  it("explains an invalid link", async () => {
    render(<VerifyEmailStatus token="expired" copy={VERIFY_EMAIL_COPY} />);
    expect(await screen.findByText(VERIFY_EMAIL_COPY[Status.Invalid])).toBeInTheDocument();
  });
});
