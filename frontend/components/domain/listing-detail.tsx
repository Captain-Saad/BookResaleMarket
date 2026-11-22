"use client";
import Link from "next/link";
import Button from "@/components/ui/button";
import ListingOverview from "@/components/domain/listing-overview";
import usePublicListing from "@/hooks/use-public-listing";
import { LoadStatus, type ListingDetailProps } from "@/lib/types";

const ListingDetail = ({ id, copy, initial, canonicalUrl }: ListingDetailProps) => {
  const detail = usePublicListing(id, copy, initial);
  if (detail.status === LoadStatus.Ready && detail.book)
    return <ListingOverview book={detail.book} copy={copy} canonicalUrl={canonicalUrl} />;
  return (
    <main className="flex-1 px-4 py-10">
      <section className="glass glass--2 mx-auto flex w-full max-w-page flex-col gap-5 p-6">
        {detail.status === LoadStatus.Loading ? (
          <>
            <h1 className="font-display text-h2 text-ink-1">{copy.title}</h1>
            <p role="status" className="text-ink-2">
              {copy.loading}
            </p>
            <div
              aria-hidden="true"
              className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]"
            >
              <div className="aspect-[2/3] animate-pulse rounded-md bg-glass-2 motion-reduce:animate-none" />
              <div className="flex flex-col gap-6">
                <div className="h-60 animate-pulse rounded-md bg-glass-2 motion-reduce:animate-none" />
                <div className="h-80 animate-pulse rounded-md bg-glass-2 motion-reduce:animate-none" />
              </div>
            </div>
          </>
        ) : (
          <>
            <h1 className="font-display text-h2 text-ink-1">{copy.unavailableTitle}</h1>
            <p role="alert" className="text-danger-ink">
              {detail.error}
            </p>
            <Button onClick={detail.retry}>{copy.retry}</Button>
          </>
        )}
        <Link
          href={copy.backHref}
          className="inline-flex min-h-11 items-center text-ink-1 underline"
        >
          {copy.back}
        </Link>
      </section>
    </main>
  );
};
export default ListingDetail;
