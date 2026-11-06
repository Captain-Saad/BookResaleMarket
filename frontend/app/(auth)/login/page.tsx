import type { Metadata } from "next";
import AuthForm from "@/components/domain/auth-form";
import { AUTH_ERROR_MESSAGES, AUTH_FORMS, ROUTES } from "@/lib/constants";
import { AuthFormId } from "@/lib/types";

const copy = AUTH_FORMS[AuthFormId.Login];

export const metadata: Metadata = { title: copy.title };

const LoginPage = () => (
  <AuthForm
    formId={AuthFormId.Login}
    copy={copy}
    errorMessages={AUTH_ERROR_MESSAGES}
    successHref={ROUTES.account}
    suspendedHref={ROUTES.suspended}
  />
);

export default LoginPage;
