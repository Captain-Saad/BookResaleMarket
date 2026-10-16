import BookCover from "@/components/domain/book-cover";
import type { FEATURED_SHELVES } from "@/lib/constants";

type Shelf = (typeof FEATURED_SHELVES)[number];

const COVER_SIZES = "(min-width: 64rem) 144px, (min-width: 30rem) 128px, 112px";

const BookShelf = ({ shelf }: { shelf: Shelf }) => (
  <section aria-labelledby={`shelf-${shelf.id}`} className="flex flex-col gap-4">
    <h3 id={`shelf-${shelf.id}`} className="font-display text-h3 text-ink-1">
      {shelf.title}
    </h3>
    <ul className="glass glass--1 flex gap-4 overflow-x-auto p-4 sm:gap-6 sm:p-6">
      {shelf.books.map((book) => (
        <li key={book.isbn} className="w-28 shrink-0 sm:w-32 lg:w-36">
          <BookCover
            coverId={book.coverId}
            title={book.title}
            author={book.author}
            sizes={COVER_SIZES}
          />
          <p className="mt-3 line-clamp-2 text-sm font-medium text-ink-1">{book.title}</p>
          <p className="text-xs text-ink-3">{book.author}</p>
        </li>
      ))}
    </ul>
  </section>
);

export default BookShelf;
