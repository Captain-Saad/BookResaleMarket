import BookShelf from "@/components/domain/book-shelf";
import Hero from "@/components/domain/hero";
import HowItWorks from "@/components/domain/how-it-works";
import { FEATURED_SHELVES } from "@/lib/constants";

const HomePage = () => (
  <main className="flex flex-col gap-16 px-4 py-12 sm:gap-24 sm:py-16">
    <Hero />
    <section
      id="shelves"
      aria-labelledby="shelves-title"
      className="mx-auto flex w-full max-w-page scroll-mt-24 flex-col gap-8"
    >
      <h2 id="shelves-title" className="text-center font-display text-h2 text-ink-1">
        Featured shelves
      </h2>
      {FEATURED_SHELVES.map((shelf) => (
        <BookShelf key={shelf.id} shelf={shelf} />
      ))}
    </section>
    <HowItWorks />
  </main>
);

export default HomePage;
