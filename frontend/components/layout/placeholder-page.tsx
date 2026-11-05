import Link from "next/link";
import type { PlaceholderPageProps } from "@/lib/types";
import { cn } from "@/lib/utils";

const PlaceholderPage = ({
  title,
  description,
  homeLink,
  narrow = false,
}: PlaceholderPageProps) => (
  <main className="flex-1 px-4 py-8">
    <section
      className={cn(
        "glass glass--2 mx-auto flex w-full flex-col items-center gap-4 px-6 py-10 text-center",
        narrow ? "max-w-md" : "max-w-page",
      )}
    >
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
