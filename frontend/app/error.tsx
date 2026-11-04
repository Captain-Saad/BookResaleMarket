"use client";

import ErrorCard from "@/components/layout/error-card";
import useLogError from "@/hooks/use-log-error";
import { ERROR_PAGE } from "@/lib/constants";
import type { ErrorPageProps } from "@/lib/types";

const ErrorPage = ({ error, retry }: ErrorPageProps) => {
  useLogError(error);

  return (
    <ErrorCard
      title={ERROR_PAGE.title}
      description={ERROR_PAGE.description}
      retryLabel={ERROR_PAGE.retryLabel}
      onRetry={retry}
    />
  );
};

export default ErrorPage;
