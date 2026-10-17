"use client";

import useLogError from "@/hooks/use-log-error";
import { ERROR_PAGE } from "@/lib/constants";
import type { ErrorPageProps } from "@/lib/types";

const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  useLogError(error);

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <section
        role="alert"
        className="glass glass--2 flex w-full max-w-lg flex-col items-center gap-4 px-6 py-10 text-center"
      >
        <h1 className="font-display text-h1 text-ink-1">{ERROR_PAGE.title}</h1>
        <p className="text-ink-2">{ERROR_PAGE.description}</p>
        <button
          type="button"
          onClick={retry}
          className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-on-brand"
        >
          {ERROR_PAGE.retryLabel}
        </button>
      </section>
    </main>
  );
};

export default ErrorPage;
