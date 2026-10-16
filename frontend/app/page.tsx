import { GLASS_TIERS, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

const HomePage = () => (
  <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-10 px-4 py-20 text-center">
    <section className="glass glass--2 flex flex-col items-center gap-4 px-6 py-10 sm:px-12">
      <h1 className="font-display text-display font-semibold tracking-tight text-ink-1">
        {SITE_NAME}
      </h1>
      <p className="max-w-md text-lg text-ink-2">{SITE_TAGLINE}</p>
    </section>
    <ul aria-label="Glass tiers" className="grid w-full gap-4 md:grid-cols-3">
      {GLASS_TIERS.map((tier) => (
        <li key={tier.className} className={`glass ${tier.className} p-6 text-start`}>
          <p className="font-display text-h3 text-ink-1">{tier.label}</p>
          <p className="text-sm text-ink-3">{tier.description}</p>
        </li>
      ))}
    </ul>
  </main>
);

export default HomePage;
