import type { ErrorCardProps } from "@/lib/types";

const ErrorCard = ({ title, description, retryLabel, onRetry }: ErrorCardProps) => (
  <main className="flex min-h-dvh items-center justify-center px-4 py-16">
    <section
      role="alert"
      className="glass glass--2 flex w-full max-w-lg flex-col items-center gap-4 px-6 py-10 text-center"
    >
      <h1 className="font-display text-h1 text-ink-1">{title}</h1>
      <p className="text-ink-2">{description}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-on-brand"
      >
        {retryLabel}
      </button>
    </section>
  </main>
);

export default ErrorCard;
