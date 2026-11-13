"use client";

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
        <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
          <ol aria-label={copy.title} className="flex gap-3 overflow-auto lg:flex-col">
            {copy.steps.map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
                className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg px-3 text-sm text-ink-1"
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
              </li>
            ))}
          </ol>
          <div className="glass glass--2 flex min-w-0 flex-col gap-5 p-5 sm:p-8">
            <h2 className="font-display text-h2 text-ink-1">{copy.steps[step]}</h2>
            {step === 0 ? (
              <>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.isbn}
                  <Input
                    name="isbn"
                    value={draft.isbn ?? ""}
                    onChange={wizard.change}
                    maxLength={32}
                    disabled={listing?.identityLocked}
                  />
                </label>
                <Button
                  variant="secondary"
                  onClick={wizard.lookup}
                  loading={busy}
                  disabled={listing?.identityLocked}
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
                    disabled={listing?.identityLocked}
                  />
                </label>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.author}
                  <Input
                    name="author"
                    value={draft.author}
                    onChange={wizard.change}
                    maxLength={200}
                    disabled={listing?.identityLocked}
                  />
                </label>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-2 text-ink-1">
                  {copy.condition}
                  <select
                    name="condition"
                    value={draft.condition}
                    onChange={wizard.change}
                    disabled={listing?.identityLocked}
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
                    disabled={listing?.purchaseLocked}
                  />
                </label>
              </>
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
              <Button variant="secondary" onClick={wizard.save} loading={busy}>
                {copy.save}
              </Button>
              <Button onClick={wizard.next} disabled={step === copy.steps.length - 1 || busy}>
                {copy.next}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
export default ListingWizard;
