import { HERO } from "@/lib/constants";

const Hero = () => (
  <section className="glass glass--2 mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 py-12 text-center sm:px-12 sm:py-16">
    <h1 className="font-display text-display font-semibold tracking-tight text-ink-1">
      {HERO.title}
    </h1>
    <p className="max-w-xl text-lg text-ink-2">{HERO.subtitle}</p>
    <div className="flex flex-wrap justify-center gap-3">
      <a
        href={HERO.primaryCta.href}
        className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 font-medium text-on-brand"
      >
        {HERO.primaryCta.label}
      </a>
      <a
        href={HERO.secondaryCta.href}
        className="glass glass--1 inline-flex min-h-11 items-center rounded-full px-6 font-medium text-ink-1"
      >
        {HERO.secondaryCta.label}
      </a>
    </div>
  </section>
);

export default Hero;
