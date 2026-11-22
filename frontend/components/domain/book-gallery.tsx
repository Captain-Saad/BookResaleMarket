"use client";

import BookCover from "@/components/domain/book-cover";
import Modal from "@/components/ui/modal";
import useBookGallery from "@/hooks/use-book-gallery";
import { CoverFit, type BookGalleryProps } from "@/lib/types";

const BookGallery = ({ book, copy }: BookGalleryProps) => {
  const gallery = useBookGallery(book);
  const cover = (
    <BookCover
      className="max-h-[60dvh]"
      src={gallery.photo?.url}
      title={book.title}
      author={book.author}
      label={`${copy.gallery}: ${book.title}`}
      sizes={copy.photoSizes}
      fit={CoverFit.Contain}
    />
  );
  return (
    <section aria-label={copy.gallery} className="flex min-w-0 flex-col gap-4">
      {gallery.photo ? (
        <Modal
          open={gallery.zoom}
          onOpenChange={gallery.setZoom}
          title={`${copy.gallery}: ${book.title}`}
          closeLabel={copy.close}
          className="w-[min(64rem,calc(100%-2rem))] break-words"
          trigger={
            <button
              type="button"
              aria-label={`${copy.zoom}: ${book.title}`}
              className="block w-full rounded-lg text-start focus-visible:outline-2 focus-visible:outline-brand"
            >
              {cover}
            </button>
          }
        >
          <div className="mx-auto w-full">
            <BookCover
              className="max-h-[70dvh]"
              src={gallery.photo.url}
              title={book.title}
              author={book.author}
              label={`${copy.gallery}: ${book.title}`}
              sizes={copy.zoomSizes}
              fit={CoverFit.Contain}
            />
          </div>
        </Modal>
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
              onClick={gallery.select(index)}
              aria-label={`${copy.photo} ${index + 1}`}
              aria-pressed={gallery.photo?.id === photo.id}
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
