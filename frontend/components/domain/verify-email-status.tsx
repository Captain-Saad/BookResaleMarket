"use client";

import Link from "next/link";
import useVerifyEmail from "@/hooks/use-verify-email";
import { type VerifyEmailStatusProps, VerifyEmailStatus as Status } from "@/lib/types";

const VerifyEmailStatus = ({ token, copy }: VerifyEmailStatusProps) => {
  const status = useVerifyEmail(token);

  return (
    <main className="flex justify-center px-4 py-10">
      <section className="glass glass--2 flex w-full max-w-md flex-col items-center gap-4 p-6 text-center sm:p-8">
        <h1 className="font-display text-h2 text-ink-1">{copy.title}</h1>
        <p role="status" className="text-ink-2">
          {copy[status]}
        </p>
        {status === Status.Verified && (
          <Link
            href={copy.loginLink.href}
            className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-on-brand"
          >
            {copy.loginLink.label}
          </Link>
        )}
      </section>
    </main>
  );
};

export default VerifyEmailStatus;
