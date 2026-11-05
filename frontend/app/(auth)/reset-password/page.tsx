import type { Metadata } from "next";
import AuthForm from "@/components/domain/auth-form";
import PlaceholderPage from "@/components/layout/placeholder-page";
import { AUTH_ERROR_MESSAGES, AUTH_FORMS, RESET_LINK_INVALID } from "@/lib/constants";
import { AuthFormId, type TokenPageProps } from "@/lib/types";

const copy = AUTH_FORMS[AuthFormId.ResetPassword];

export const metadata: Metadata = { title: copy.title };

const ResetPasswordPage = async ({ searchParams }: TokenPageProps) => {
  const { token } = await searchParams;

  return typeof token === "string" ? (
    <AuthForm
      formId={AuthFormId.ResetPassword}
      copy={copy}
      errorMessages={AUTH_ERROR_MESSAGES}
      token={token}
    />
  ) : (
    <PlaceholderPage
      title={RESET_LINK_INVALID.title}
      description={RESET_LINK_INVALID.description}
      homeLink={RESET_LINK_INVALID.link}
      narrow
    />
  );
};

export default ResetPasswordPage;
