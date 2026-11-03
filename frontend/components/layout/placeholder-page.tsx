import Link from "next/link";
import type { PlaceholderPageProps } from "@/lib/types";

const PlaceholderPage = ({ title, description, homeLink }: PlaceholderPageProps) => (
  <main className="flex min-h-dvh items-center justify-center px-4 py-16">
    <section className="glass glass--2 flex w-full max-w-lg flex-col items-center gap-4 px-6 py-10 text-center">
      <h1 className="font-display text-h1 text-ink-1">{title}</h1>
      <p className="text-ink-2">{description}</p>
      <Link
        href={homeLink.href}
        className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-on-brand"
      >
        {homeLink.label}
      </Link>
    </section>
  </main>
);

export default PlaceholderPage;
