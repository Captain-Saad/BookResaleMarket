import type { Metadata } from "next";
import AuthForm from "@/components/domain/auth-form";
import { AUTH_ERROR_MESSAGES, AUTH_FORMS } from "@/lib/constants";
import { AuthFormId, type TokenPageProps } from "@/lib/types";

export const metadata: Metadata = { title: AUTH_FORMS[AuthFormId.ResetPassword].title };

const ResetPasswordPage = async ({ searchParams }: TokenPageProps) => {
  const { token } = await searchParams;

  return typeof token === "string" ? (
    <AuthForm
      formId={AuthFormId.ResetPassword}
      copy={AUTH_FORMS[AuthFormId.ResetPassword]}
      errorMessages={AUTH_ERROR_MESSAGES}
      token={token}
    />
  ) : (
    <AuthForm
      formId={AuthFormId.ChangePassword}
      copy={AUTH_FORMS[AuthFormId.ChangePassword]}
      errorMessages={AUTH_ERROR_MESSAGES}
    />
  );
};

export default ResetPasswordPage;
