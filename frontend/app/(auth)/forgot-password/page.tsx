import type { Metadata } from "next";
import AuthForm from "@/components/domain/auth-form";
import { AUTH_ERROR_MESSAGES, AUTH_FORMS } from "@/lib/constants";
import { AuthFormId } from "@/lib/types";

const copy = AUTH_FORMS[AuthFormId.ForgotPassword];

export const metadata: Metadata = { title: copy.title };

const ForgotPasswordPage = () => (
  <AuthForm formId={AuthFormId.ForgotPassword} copy={copy} errorMessages={AUTH_ERROR_MESSAGES} />
);

export default ForgotPasswordPage;
