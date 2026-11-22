"use client";

import BookCard from "@/components/domain/book-card";
import CatalogFilters from "@/components/domain/catalog-filters";
import Button from "@/components/ui/button";
import Drawer from "@/components/ui/drawer";
import Input from "@/components/ui/input";
import useCatalog from "@/hooks/use-catalog";
import { LoadStatus, type CatalogProps } from "@/lib/types";

const BooksCatalog = ({ copy }: CatalogProps) => {
  const catalog = useCatalog(copy);
  return (
    <main className="flex-1 px-4 py-8 sm:py-12">
      <div className="mx-auto flex w-full max-w-page flex-col gap-8">
        <header className="glass glass--2 flex flex-col gap-4 p-5 sm:p-8">
          <h1 className="font-display text-h1 text-ink-1">{copy.title}</h1>
          <p className="max-w-2xl text-ink-2">{copy.description}</p>
          <form
            key={catalog.filters.q}
            onSubmit={catalog.submit}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <label className="flex flex-1 flex-col gap-2 text-sm text-ink-2" htmlFor={copy.queryId}>
              {copy.query}
              <Input
                id={copy.queryId}
                name="q"
                defaultValue={catalog.filters.q ?? ""}
                maxLength={200}
                type="search"
              />
            </label>
            <Button type="submit">{copy.search}</Button>
          </form>
          <div className="lg:hidden">
            <Drawer
              trigger={<Button variant="secondary">{copy.filtersButton}</Button>}
              open={catalog.mobileOpen}
              onOpenChange={catalog.setMobileOpen}
              side="bottom"
              title={copy.filtersTitle}
              description={copy.filtersHelp}
              closeLabel={copy.close}
            >
              <div className="mt-6">
                <CatalogFilters
                  copy={copy}
                  filters={catalog.filters}
                  prefix={copy.mobilePrefix}
                  error={catalog.error}
                  onSubmit={catalog.submit}
                  onReset={catalog.reset}
                />
              </div>
            </Drawer>
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="glass glass--2 hidden self-start p-5 lg:block">
            <h2 className="mb-5 font-display text-h3 text-ink-1">{copy.filtersTitle}</h2>
            <CatalogFilters
              copy={copy}
              filters={catalog.filters}
              prefix={copy.desktopPrefix}
              onSubmit={catalog.submit}
              onReset={catalog.reset}
            />
          </aside>
          <section className="min-w-0" aria-label={copy.search}>
            {catalog.error && !catalog.mobileOpen && (
              <p role="alert" className="mb-4 text-danger-ink">
                {catalog.error}
              </p>
            )}
            {catalog.status === LoadStatus.Loading ? (
              <>
                <p role="status" className="mb-4 text-ink-2">
                  {copy.loading}
                </p>
                <ul aria-hidden="true" className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {Array.from({ length: 6 }, (_, index) => (
                    <li
                      key={index}
                      className="glass glass--2 animate-pulse p-4 motion-reduce:animate-none"
                    >
                      <div className="aspect-[2/3] rounded-md bg-glass-2" />
                      <div className="mt-4 h-5 rounded-md bg-glass-2" />
                    </li>
                  ))}
                </ul>
              </>
            ) : catalog.status === LoadStatus.Failed ? (
              <Button onClick={catalog.retry}>{copy.retry}</Button>
            ) : catalog.items.length === 0 ? (
              <p role="status" className="glass glass--2 p-8 text-ink-2">
                {copy.empty}
              </p>
            ) : (
              <>
                <ul className="grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {catalog.items.map((book) => (
                    <li key={book.id} className="min-w-0">
                      <BookCard book={book} copy={copy} />
                    </li>
                  ))}
                </ul>
                {catalog.cursor && (
                  <div className="mt-6 flex justify-center">
                    <Button onClick={catalog.more} loading={catalog.moreBusy}>
                      {copy.more}
                    </Button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};
export default BooksCatalog;
