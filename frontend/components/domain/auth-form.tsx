"use client";

import Link from "next/link";
import FormFields from "@/components/domain/form-fields";
import Button from "@/components/ui/button";
import useAuthForm from "@/hooks/use-auth-form";
import type { AuthFormProps } from "@/lib/types";

const AuthForm = ({
  formId,
  copy,
  errorMessages,
  token,
  successHref,
  suspendedHref,
}: AuthFormProps) => {
  const { form, onSubmit, isComplete, completionMessage } = useAuthForm({
    formId,
    errorMessages,
    token,
    successHref,
    suspendedHref,
  });
  const rootError = form.formState.errors.root?.message;

  return (
    <main className="flex justify-center px-4 py-10">
      <section className="glass glass--2 flex w-full max-w-md flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-display text-h2 text-ink-1">{copy.title}</h1>
          <p className="text-ink-2">{copy.description}</p>
        </div>
        {isComplete ? (
          <p role="status" className="text-center text-ink-1">
            {completionMessage ?? copy.successMessage}
          </p>
        ) : (
          <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
            <FormFields form={form} fields={copy.fields} idPrefix={formId} />
            {rootError && (
              <p role="alert" className="text-sm text-danger-ink">
                {rootError}
              </p>
            )}
            <Button type="submit" loading={form.formState.isSubmitting}>
              {copy.submitLabel}
            </Button>
          </form>
        )}
        <ul className="flex flex-col items-center gap-1">
          {copy.links.map(({ href, label }) => (
            <li key={href}>
              <Link
                href={href}
                className="inline-flex min-h-11 items-center text-sm text-ink-2 underline underline-offset-4 hover:text-ink-1"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
};

export default AuthForm;
