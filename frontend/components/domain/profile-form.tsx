"use client";

import Link from "next/link";
import FormFields from "@/components/domain/form-fields";
import ResourceState from "@/components/domain/resource-state";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import { useProfileForm } from "@/hooks/use-account";
import { LoadStatus, type ProfileFormProps, SaveStatus } from "@/lib/types";

const ProfileForm = ({ copy }: ProfileFormProps) => {
  const { status, account, retry, form, onSubmit, saveStatus } = useProfileForm();

  return (
    <section className="glass glass--2 flex flex-col gap-6 p-6">
      <h1 className="font-display text-h2 text-ink-1">{copy.title}</h1>
      {status !== LoadStatus.Ready || !account ? (
        <ResourceState status={status} copy={copy} onRetry={retry} />
      ) : (
        <form method="post" noValidate onSubmit={onSubmit} className="flex max-w-xl flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-ink-1">{copy.emailLabel}</p>
            <p className="flex flex-wrap items-center gap-2 text-ink-2">
              {account.email}
              {!account.emailVerified && <Badge tone="warning">{copy.emailUnverified}</Badge>}
            </p>
          </div>
          <FormFields form={form} fields={copy.fields} idPrefix="profile" />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" loading={form.formState.isSubmitting}>
              {copy.submitLabel}
            </Button>
            {saveStatus === SaveStatus.Saved && (
              <p role="status" className="text-sm text-success-ink">
                {copy.saved}
              </p>
            )}
            {saveStatus === SaveStatus.Failed && (
              <p role="alert" className="text-sm text-danger-ink">
                {copy.saveFailed}
              </p>
            )}
          </div>
        </form>
      )}
      <Link
        href={copy.passwordLink.href}
        className="inline-flex min-h-11 items-center self-start text-sm text-ink-2 underline underline-offset-4 hover:text-ink-1"
      >
        {copy.passwordLink.label}
      </Link>
    </section>
  );
};

export default ProfileForm;
