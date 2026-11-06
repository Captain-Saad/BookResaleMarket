import type { Metadata } from "next";
import AuthForm from "@/components/domain/auth-form";
import VerifyEmailStatus from "@/components/domain/verify-email-status";
import { AUTH_ERROR_MESSAGES, AUTH_FORMS, VERIFY_EMAIL_COPY } from "@/lib/constants";
import { AuthFormId, type TokenPageProps } from "@/lib/types";

export const metadata: Metadata = { title: VERIFY_EMAIL_COPY.title };

const VerifyEmailPage = async ({ searchParams }: TokenPageProps) => {
  const { token } = await searchParams;

  return typeof token === "string" ? (
    <VerifyEmailStatus token={token} copy={VERIFY_EMAIL_COPY} />
  ) : (
    <AuthForm
      formId={AuthFormId.ResendVerification}
      copy={AUTH_FORMS[AuthFormId.ResendVerification]}
      errorMessages={AUTH_ERROR_MESSAGES}
    />
  );
};

export default VerifyEmailPage;
