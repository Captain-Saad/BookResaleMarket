import Button from "@/components/ui/button";
import { formatPrice } from "@/lib/listings";
import type { PurchaseCardProps } from "@/lib/types";

const BookPurchaseCard = ({ book, copy, compact = false }: PurchaseCardProps) => {
  const label =
    book.status === "sold"
      ? copy.sold
      : book.status === "reserved"
        ? copy.reserved
        : book.status === "incoming"
          ? copy.incoming
          : copy.buy;
  const explanation =
    book.status === "sold"
      ? copy.soldHelp
      : book.status === "reserved"
        ? copy.reservedHelp
        : book.status === "incoming"
          ? copy.incomingHelp
          : copy.purchasePending;
  return (
    <div
      className={
        compact
          ? "glass glass--3 flex flex-wrap items-center justify-between gap-3 rounded-lg p-3"
          : "glass glass--2 flex flex-col gap-5 p-6"
      }
    >
      <div className={compact ? "shrink-0" : "min-w-0"}>
        <p className="text-xs text-ink-2">{copy.bookPrice}</p>
        <p
          className={
            compact
              ? "font-display text-xl whitespace-nowrap text-ink-1"
              : "break-words font-display text-h2 text-ink-1"
          }
        >
          {formatPrice(book.priceMinor, book.currency)}
        </p>
        {!compact && (
          <p className="mt-2 text-sm text-ink-2">{book.available ? copy.available : label}</p>
        )}
      </div>
      {!compact && (
        <>
          <p className="text-sm text-ink-2">{explanation}</p>
          <dl className="flex flex-col gap-2 text-sm">
            <dt className="text-ink-2">{copy.delivery}</dt>
            <dd className="text-ink-1">{book.deliveryEstimate ?? copy.deliveryPending}</dd>
          </dl>
        </>
      )}
      <Button disabled className={compact ? "min-w-0 flex-1 basis-40 px-3 text-sm" : undefined}>
        {label}
      </Button>
    </div>
  );
};
export default BookPurchaseCard;
