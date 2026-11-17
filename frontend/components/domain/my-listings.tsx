"use client";

import Link from "next/link";
import Badge from "@/components/ui/badge";
import Button from "@/components/ui/button";
import Modal from "@/components/ui/modal";
import ListingWizard from "@/components/domain/listing-wizard";
import useMyListings from "@/hooks/use-my-listings";
import { formatPrice } from "@/lib/listings";
import { LoadStatus, type MyListingsProps } from "@/lib/types";

const MyListings = ({ copy }: MyListingsProps) => {
  const manager = useMyListings(copy);
  if (manager.editing)
    return <ListingWizard key={manager.editing.id} copy={copy} initial={manager.editing} />;
  return (
    <main className="flex-1 px-4 py-8">
      <section className="glass glass--2 mx-auto flex w-full max-w-page flex-col gap-6 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-h1 text-ink-1">{copy.myListings}</h1>
          <Link
            href={copy.links.create}
            className="inline-flex min-h-11 items-center rounded-full bg-brand px-6 text-on-brand"
          >
            {copy.newListing}
          </Link>
        </div>
        {manager.error && (
          <p role="alert" className="text-danger-ink">
            {manager.error}
          </p>
        )}
        {manager.status === LoadStatus.Loading && (
          <p role="status" className="text-ink-2">
            {copy.loading}
          </p>
        )}
        {manager.status === LoadStatus.Failed && (
          <Button onClick={manager.retry}>{copy.retry}</Button>
        )}
        {manager.status === LoadStatus.Ready && !manager.items.length && (
          <p className="text-ink-2">{copy.empty}</p>
        )}
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {manager.items.map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 flex-col gap-3 rounded-lg border border-glass-border p-5"
            >
              <Badge>{copy.statuses[item.status]}</Badge>
              <h2 className="font-display text-h3 text-ink-1">{item.title || copy.newListing}</h2>
              <p className="text-ink-2">{item.author}</p>
              <p className="font-medium text-ink-1">
                {formatPrice(item.priceMinor, item.currency)}
              </p>
              {item.identityLocked && <p className="text-sm text-ink-2">{copy.locked}</p>}
              {item.purchaseLocked && <p className="text-sm text-ink-2">{copy.purchased}</p>}
              {item.returnOrDonationPending && (
                <p className="text-sm text-ink-2">{copy.returnPending}</p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                <Button variant="secondary" onClick={manager.edit(item)}>
                  {copy.edit}
                </Button>
                <Button
                  variant="ghost"
                  onClick={manager.askDeactivate(item)}
                  disabled={item.purchaseLocked || item.status === "deactivated"}
                >
                  {copy.deactivate}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {manager.cursor && (
          <Button onClick={manager.more} disabled={manager.status === LoadStatus.Loading}>
            {copy.more}
          </Button>
        )}
        <Modal
          open={!!manager.deactivating}
          onOpenChange={manager.setOpen}
          title={copy.deactivateTitle}
          description={copy.deactivateHelp}
          closeLabel={copy.close}
        >
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={manager.deactivate}>
              {copy.confirm}
            </Button>
            <Button variant="ghost" onClick={manager.close}>
              {copy.cancel}
            </Button>
          </div>
        </Modal>
      </section>
    </main>
  );
};
export default MyListings;
