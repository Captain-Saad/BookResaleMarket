import Link from "next/link";
import BookCover from "@/components/domain/book-cover";
import Badge from "@/components/ui/badge";
import { formatPrice } from "@/lib/listings";
import type { BookCardProps } from "@/lib/types";

const BookCard = ({ book, copy }: BookCardProps) => (
  <article className="glass glass--2 flex h-full min-w-0 flex-col gap-4 p-4">
    <Link
      href={`${copy.detailBase}/${book.id}`}
      aria-label={`${copy.viewBook}: ${book.title}`}
      className="flex flex-col gap-4 rounded-md focus-visible:outline-2 focus-visible:outline-brand"
    >
      <BookCover
        label={`${copy.coverLabel}: ${book.title}`}
        src={book.coverUrl}
        title={book.title}
        author={book.author}
        sizes={copy.coverSizes}
      />
      <div className="min-w-0">
        <h2 className="line-clamp-2 font-display text-h3 text-ink-1">{book.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm text-ink-2">{book.author}</p>
      </div>
    </Link>
    <div className="flex flex-wrap gap-2">
      <Badge>{copy.conditions.find(({ value }) => value === book.condition)?.label}</Badge>
      <Badge>{copy.fulfillments.find(({ value }) => value === book.fulfillment)?.label}</Badge>
    </div>
    <p className="break-words font-medium text-ink-1">
      {formatPrice(book.priceMinor, book.currency)}
    </p>
    <p className="text-sm break-words text-ink-2">
      {[book.location.city, book.location.region].filter(Boolean).join(", ")}
    </p>
    <p className="mt-auto text-sm text-ink-2">
      {book.available
        ? copy.available
        : book.status === "incoming"
          ? copy.incoming
          : copy.unavailable}
    </p>
  </article>
);
export default BookCard;
