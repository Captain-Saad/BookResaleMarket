import { LOADING_LABEL } from "@/lib/constants";

const Loading = () => (
  <main className="flex min-h-dvh items-center justify-center px-4 py-16">
    <p
      role="status"
      className="glass glass--2 px-6 py-3 text-ink-2 motion-safe:animate-pulse motion-reduce:animate-none"
    >
      {LOADING_LABEL}
    </p>
  </main>
);

export default Loading;
