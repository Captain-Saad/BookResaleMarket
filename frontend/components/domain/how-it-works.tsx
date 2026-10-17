import { HOW_IT_WORKS_STEPS } from "@/lib/constants";

const HowItWorks = () => (
  <section
    id="how-it-works"
    aria-labelledby="how-it-works-title"
    className="mx-auto flex w-full max-w-page scroll-mt-24 flex-col gap-8"
  >
    <h2 id="how-it-works-title" className="text-center font-display text-h2 text-ink-1">
      How it works
    </h2>
    <ol className="grid gap-4 md:grid-cols-3">
      {HOW_IT_WORKS_STEPS.map((step, index) => (
        <li key={step.title} className="glass glass--1 flex flex-col gap-3 p-6">
          <span aria-hidden="true" className="font-mono text-sm text-ink-3">
            {String(index + 1).padStart(2, "0")}
          </span>
          <h3 className="font-display text-h3 text-ink-1">{step.title}</h3>
          <p className="text-ink-2">{step.description}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default HowItWorks;
