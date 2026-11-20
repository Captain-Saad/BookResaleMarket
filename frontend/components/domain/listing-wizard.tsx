"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/listings";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import useListingWizard from "@/hooks/use-listing-wizard";
import type { ListingWizardProps } from "@/lib/types";

const ListingWizard = ({ copy, initial }: ListingWizardProps) => {
  const wizard = useListingWizard(copy, initial);
  const { draft, listing, step, busy, error, message } = wizard;
  return (
    <main className="flex-1 px-4 py-8">
      <section className="glass glass--2 mx-auto flex w-full max-w-page flex-col gap-6 p-5 sm:p-8">
        <div>
          <h1 className="font-display text-h1 text-ink-1">{copy.title}</h1>
          <p className="mt-3 max-w-2xl text-ink-2">{copy.description}</p>
        </div>
        <Link
          href={copy.links.mine}
          className="inline-flex min-h-11 items-center self-start text-ink-1 underline"
        >
          {copy.myListings}
        </Link>
        <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
          <ol
            aria-label={copy.title}
            className="flex gap-3 overflow-auto focus-visible:outline-2 focus-visible:outline-brand lg:flex-col"
          >
            {copy.steps.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
                className="shrink-0"
              >
                <button
                  type="button"
                  onClick={wizard.goToStep(index)}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-ink-1 focus-visible:outline-2 focus-visible:outline-brand"
                >
                  <span
                    className={
                      index === step
                        ? "flex size-8 items-center justify-center rounded-full bg-brand text-on-brand"
                        : "flex size-8 items-center justify-center rounded-full bg-glass-2"
                    }
                  >
                    {index + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className="glass glass--2 flex min-w-0 flex-col gap-5 p-5 sm:p-8">
            <h2 className="font-display text-h2 text-ink-1">{copy.steps[step]}</h2>
            {listing?.identityLocked && <p className="text-sm text-ink-2">{copy.locked}</p>}
            {listing?.purchaseLocked && <p className="text-sm text-ink-2">{copy.purchased}</p>}
            {step === 0 ? (
              <>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.isbn}
                  <Input
                    name="isbn"
                    value={draft.isbn ?? ""}
                    onChange={wizard.change}
                    maxLength={32}
                    disabled={busy || listing?.identityLocked}
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={wizard.lookup}
                  loading={busy}
                  disabled={busy || listing?.identityLocked}
                >
                  {copy.lookup}
                </Button>
                <p className="text-sm text-ink-2">{copy.manual}</p>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.titleLabel}
                  <Input
                    name="title"
                    value={draft.title}
                    onChange={wizard.change}
                    maxLength={300}
                    disabled={busy || listing?.identityLocked}
                  />
                </label>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.author}
                  <Input
                    name="author"
                    value={draft.author}
                    onChange={wizard.change}
                    maxLength={200}
                    disabled={busy || listing?.identityLocked}
                  />
                </label>
              </>
            ) : step === 1 ? (
              <>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.condition}
                  <select
                    name="condition"
                    value={draft.condition}
                    onChange={wizard.change}
                    disabled={busy || listing?.identityLocked}
                    className="min-h-11 rounded-md border border-glass-border bg-bg-1 px-3 text-ink-1"
                  >
                    {copy.conditions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.notes}
                  <Textarea
                    name="notes"
                    value={draft.notes}
                    onChange={wizard.change}
                    maxLength={2000}
                    disabled={busy || listing?.purchaseLocked}
                  />
                </label>
              </>
            ) : null}
            {step === 2 && (
              <>
                <p className="text-ink-2">{copy.photoHelp}</p>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.upload}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={wizard.upload}
                    disabled={busy || listing?.purchaseLocked}
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {listing?.photos.map((photo) => (
                    <div key={photo.id} className="flex flex-col gap-2">
                      <Image
                        unoptimized
                        src={photo.url}
                        alt={copy.photoAlt}
                        width={240}
                        height={320}
                        className="aspect-3/4 w-full rounded-lg object-cover"
                      />
                      <Button
                        variant="ghost"
                        onClick={wizard.removePhoto(photo.id)}
                        disabled={busy || listing.purchaseLocked}
                      >
                        {copy.removePhoto}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
            {step === 3 && (
              <>
                <fieldset className="grid gap-4 md:grid-cols-2">
                  <legend className="mb-4 text-ink-1">{copy.fulfillmentLabel}</legend>
                  <label className="flex min-h-11 cursor-pointer flex-col gap-3 rounded-lg border border-glass-border p-4 text-ink-1">
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="fulfillment"
                        value="warehouse"
                        checked={draft.fulfillment === "warehouse"}
                        onChange={wizard.change}
                        disabled={busy || listing?.purchaseLocked}
                      />
                      {copy.warehouse}
                    </span>
                    <span className="text-sm text-ink-2">{copy.warehouseHelp}</span>
                  </label>
                  <label className="flex min-h-11 cursor-pointer flex-col gap-3 rounded-lg border border-glass-border p-4 text-ink-1">
                    <span className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="fulfillment"
                        value="on_demand"
                        checked={draft.fulfillment === "on_demand"}
                        onChange={wizard.change}
                        disabled={busy || listing?.purchaseLocked}
                      />
                      {copy.onDemand}
                    </span>
                    <span className="text-sm text-ink-2">{copy.onDemandHelp}</span>
                  </label>
                </fieldset>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.address}
                  <select
                    name="addressId"
                    value={draft.addressId ?? ""}
                    onChange={wizard.change}
                    disabled={busy || listing?.purchaseLocked}
                    className="min-h-11 rounded-md border border-glass-border bg-bg-1 px-3"
                  >
                    <option value="">{copy.address}</option>
                    {wizard.addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.recipientName} — {address.city}, {address.country}
                      </option>
                    ))}
                  </select>
                </label>
                {!wizard.addresses.length && (
                  <Link href={copy.links.addresses} className="min-h-11 text-ink-2 underline">
                    {copy.noAddress}
                  </Link>
                )}
              </>
            )}
            {step === 4 && (
              <>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.price}
                  <Input
                    name="price"
                    inputMode="decimal"
                    value={wizard.price}
                    onChange={wizard.changePrice}
                    disabled={busy || listing?.purchaseLocked}
                  />
                </label>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.currency}
                  <select
                    name="currency"
                    value={draft.currency}
                    onChange={wizard.change}
                    disabled={busy || listing?.purchaseLocked}
                    className="min-h-11 rounded-md border border-glass-border bg-bg-1 px-3"
                  >
                    {copy.currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {step === 5 && (
              <dl className="grid gap-3 text-ink-1">
                <div>
                  <dt className="text-sm text-ink-2">{copy.titleLabel}</dt>
                  <dd>{draft.title}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-2">{copy.author}</dt>
                  <dd>{draft.author}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-2">{copy.condition}</dt>
                  <dd>
                    {copy.conditions.find((option) => option.value === draft.condition)?.label}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-2">{copy.notes}</dt>
                  <dd className="whitespace-pre-wrap">{draft.notes}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-2">{copy.fulfillmentLabel}</dt>
                  <dd>{draft.fulfillment === "warehouse" ? copy.warehouse : copy.onDemand}</dd>
                </div>
                <div>
                  <dt className="text-sm text-ink-2">{copy.price}</dt>
                  <dd>{formatPrice(draft.priceMinor, draft.currency)}</dd>
                </div>
              </dl>
            )}
            {error && (
              <p role="alert" className="text-danger-ink">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="text-ink-1">
                {message}
              </p>
            )}
            <div className="flex flex-wrap justify-between gap-3">
              <Button variant="ghost" onClick={wizard.back} disabled={step === 0 || busy}>
                {copy.back}
              </Button>
              <Button
                variant="secondary"
                onClick={wizard.save}
                loading={busy}
                disabled={busy || listing?.purchaseLocked}
              >
                {copy.save}
              </Button>
              <Button
                onClick={step === copy.steps.length - 1 ? wizard.publish : wizard.next}
                disabled={busy || (step === copy.steps.length - 1 && listing?.purchaseLocked)}
              >
                {step === copy.steps.length - 1 ? copy.publish : copy.next}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
export default ListingWizard;
