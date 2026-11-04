"use client";

import ErrorCard from "@/components/layout/error-card";
import useLogError from "@/hooks/use-log-error";
import { ERROR_PAGE } from "@/lib/constants";
import { fontVariables } from "@/lib/fonts";
import { type ErrorPageProps, Theme } from "@/lib/types";
import "@/styles/globals.css";

const GlobalError = ({ error, retry }: ErrorPageProps) => {
  useLogError(error);

  return (
    <html lang="en" data-theme={Theme.Dark} className={fontVariables}>
      <body className="min-h-dvh bg-bg-0 antialiased">
        <ErrorCard
          title={ERROR_PAGE.title}
          description={ERROR_PAGE.description}
          retryLabel={ERROR_PAGE.retryLabel}
          onRetry={retry}
        />
      </body>
    </html>
  );
};

export default GlobalError;
