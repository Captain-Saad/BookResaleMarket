import Link from "next/link";
import type { HeroProps } from "@/lib/types";

const Hero = ({ title, subtitle, primaryCta, secondaryCta }: HeroProps) => (
  <section className="glass glass--2 mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 py-12 text-center sm:px-12 sm:py-16">
    <h1 className="font-display text-display font-semibold tracking-tight text-ink-1">{title}</h1>
    <p className="max-w-xl text-lg text-ink-2">{subtitle}</p>
    <div className="flex flex-wrap justify-center gap-3">
      <Link
        href={primaryCta.href}
        className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-on-brand"
      >
        {primaryCta.label}
      </Link>
      <Link
        href={secondaryCta.href}
        className="glass glass--1 inline-flex min-h-11 items-center rounded-full px-6 font-medium text-ink-1"
      >
        {secondaryCta.label}
      </Link>
    </div>
  </section>
);

export default Hero;
