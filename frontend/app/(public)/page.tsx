import BookShelf from "@/components/domain/book-shelf";
import HealthBadge from "@/components/domain/health-badge";
import Hero from "@/components/domain/hero";
import HowItWorks from "@/components/domain/how-it-works";
import {
  COVER_SIZES,
  FEATURED_SHELVES,
  FEATURED_SHELVES_TITLE,
  HEALTH_BADGE_LABELS,
  HEALTH_BADGE_TONES,
  HERO,
  HOW_IT_WORKS_STEPS,
  HOW_IT_WORKS_TITLE,
  SECTION_IDS,
} from "@/lib/constants";

const HomePage = () => (
  <main className="flex flex-col gap-16 px-4 py-12 sm:gap-24 sm:py-16">
    <Hero
      title={HERO.title}
      subtitle={HERO.subtitle}
      primaryCta={HERO.primaryCta}
      secondaryCta={HERO.secondaryCta}
    />
    {process.env.NODE_ENV !== "production" && (
      <HealthBadge labels={HEALTH_BADGE_LABELS} tones={HEALTH_BADGE_TONES} />
    )}
    <section
      id={SECTION_IDS.shelves}
      aria-labelledby={`${SECTION_IDS.shelves}-title`}
      className="mx-auto flex w-full max-w-page scroll-mt-24 flex-col gap-8"
    >
      <h2
        id={`${SECTION_IDS.shelves}-title`}
        className="text-center font-display text-h2 text-ink-1"
      >
        {FEATURED_SHELVES_TITLE}
      </h2>
      {FEATURED_SHELVES.map((shelf) => (
        <BookShelf key={shelf.id} shelf={shelf} coverSizes={COVER_SIZES} />
      ))}
    </section>
    <HowItWorks id={SECTION_IDS.howItWorks} title={HOW_IT_WORKS_TITLE} steps={HOW_IT_WORKS_STEPS} />
  </main>
);

export default HomePage;
