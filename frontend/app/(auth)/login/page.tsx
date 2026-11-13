import type { Metadata } from "next";
import AuthForm from "@/components/domain/auth-form";
import { safeNextPath } from "@/lib/auth/guards";
import { AUTH_ERROR_MESSAGES, AUTH_FORMS, ROUTES } from "@/lib/constants";
import { AuthFormId, type LoginPageProps } from "@/lib/types";

const copy = AUTH_FORMS[AuthFormId.Login];

export const metadata: Metadata = { title: copy.title };

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const { next } = await searchParams;

  return (
    <AuthForm
      formId={AuthFormId.Login}
      copy={copy}
      errorMessages={AUTH_ERROR_MESSAGES}
      successHref={safeNextPath(next)}
      suspendedHref={ROUTES.suspended}
    />
  );
};

export default LoginPage;
