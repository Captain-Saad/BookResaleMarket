"use client";

import BookCover from "@/components/domain/book-cover";
import { useId } from "react";
import useBookGallery from "@/hooks/use-book-gallery";
import { CoverFit, type BookGalleryProps } from "@/lib/types";

const BookGallery = ({ book, copy }: BookGalleryProps) => {
  const { photo, dialogRef, open, close, select } = useBookGallery(book);
  const titleId = useId();
  const cover = (
    <BookCover
      className="max-h-[60dvh]"
      src={photo?.url}
      title={book.title}
      author={book.author}
      label={`${copy.gallery}: ${book.title}`}
      sizes={copy.photoSizes}
      fit={CoverFit.Contain}
    />
  );
  return (
    <section
      aria-label={copy.gallery}
      className="flex min-w-0 flex-col gap-4 [contain:layout_paint]"
    >
      {photo ? (
        <>
          <button
            type="button"
            onClick={open}
            aria-label={`${copy.zoom}: ${book.title}`}
            aria-haspopup="dialog"
            className="block w-full rounded-lg text-start focus-visible:outline-2 focus-visible:outline-brand"
          >
            {cover}
          </button>
          <dialog
            ref={dialogRef}
            aria-labelledby={titleId}
            className="glass glass--flat fixed inset-0 m-auto max-h-[85dvh] w-[min(64rem,calc(100%-2rem))] max-w-none overflow-auto bg-bg-1 p-6 text-ink-1 backdrop:bg-bg-0"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id={titleId} className="font-display text-h3 break-words">
                {`${copy.gallery}: ${book.title}`}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label={copy.close}
                className="min-h-11 shrink-0 rounded-full px-4 text-sm"
              >
                {copy.close}
              </button>
            </div>
            <div className="mx-auto w-full">
              <BookCover
                className="max-h-[70dvh]"
                src={photo.url}
                title={book.title}
                author={book.author}
                label={`${copy.gallery}: ${book.title}`}
                sizes={copy.zoomSizes}
                fit={CoverFit.Contain}
              />
            </div>
          </dialog>
        </>
      ) : (
        <>
          {cover}
          <p className="text-sm text-ink-2">{copy.noPhotos}</p>
        </>
      )}
      {book.photos.length > 1 && (
        <div className="flex gap-3 overflow-auto pb-2">
          {book.photos.map((photo, index) => (
            <button
              key={photo.id}
              type="button"
              onClick={select(index)}
              aria-label={`${copy.photo} ${index + 1}`}
              aria-pressed={photo?.id === photo.id}
              className="w-16 shrink-0 rounded-md border-2 border-transparent text-start aria-pressed:border-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              <BookCover
                src={photo.url}
                title={book.title}
                author={book.author}
                label={`${copy.photo} ${index + 1}`}
                sizes={copy.thumbSizes}
                fit={CoverFit.Contain}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
export default BookGallery;
