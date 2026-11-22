import Link from "next/link";
import Badge from "@/components/ui/badge";
import BookGallery from "@/components/domain/book-gallery";
import BookPurchaseCard from "@/components/domain/book-purchase-card";
import type { ListingOverviewProps } from "@/lib/types";

const ListingOverview = ({ book, copy }: ListingOverviewProps) => (
  <main className="flex-1 px-4 pt-8 pb-44 md:pb-28 lg:pb-10">
    <div className="mx-auto flex w-full max-w-page flex-col gap-6">
      <Link
        href={copy.backHref}
        className="inline-flex min-h-11 items-center self-start text-ink-1 underline"
      >
        {copy.back}
      </Link>
      <header className="glass glass--2 flex flex-col gap-3 p-5 sm:p-8">
        <h1 className="font-display text-h1 break-words text-ink-1">{book.title}</h1>
        <p className="text-lg break-words text-ink-2">{book.author}</p>
        <div className="flex flex-wrap gap-2">
          <Badge>{copy.conditions.find(({ value }) => value === book.condition)?.label}</Badge>
          <Badge>{copy.fulfillments.find(({ value }) => value === book.fulfillment)?.label}</Badge>
          <Badge>
            {book.available
              ? copy.available
              : book.status === "incoming"
                ? copy.incoming
                : book.status === "reserved"
                  ? copy.reserved
                  : copy.sold}
          </Badge>
        </div>
      </header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
        <div className="glass glass--2 min-w-0 p-4 sm:p-6">
          <BookGallery book={book} copy={copy} />
        </div>
        <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-6">
          <BookPurchaseCard book={book} copy={copy} />
          <section className="glass glass--2 flex flex-col gap-4 p-6">
            <h2 className="font-display text-h3 text-ink-1">{copy.notes}</h2>
            <p className="text-ink-2 break-words whitespace-pre-line">
              {book.notes || copy.noNotes}
            </p>
            <dl className="grid gap-2 text-sm">
              <dt className="text-ink-2">{copy.condition}</dt>
              <dd className="text-ink-1">
                {copy.conditions.find(({ value }) => value === book.condition)?.label}
              </dd>
              {book.isbn && (
                <>
                  <dt className="text-ink-2">{copy.isbn}</dt>
                  <dd className="font-mono break-all text-ink-1">{book.isbn}</dd>
                </>
              )}
              <dt className="text-ink-2">{copy.fulfillment}</dt>
              <dd className="text-ink-1">
                {copy.fulfillments.find(({ value }) => value === book.fulfillment)?.label}
              </dd>
              <dt className="text-ink-2">{copy.sellerArea}</dt>
              <dd className="break-words text-ink-1">
                {[book.location.city, book.location.region].filter(Boolean).join(", ")}
              </dd>
            </dl>
            <p className="text-xs text-ink-2">{copy.locationHelp}</p>
          </section>
        </aside>
      </div>
      <div className="fixed inset-x-3 bottom-24 z-20 md:bottom-3 lg:hidden">
        <BookPurchaseCard book={book} copy={copy} compact />
      </div>
    </div>
  </main>
);
export default ListingOverview;
