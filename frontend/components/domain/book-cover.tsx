"use client";

import Image from "next/image";
import type { SyntheticEvent } from "react";
import { OPEN_LIBRARY_COVER_URL } from "@/lib/constants";
import type { BookCoverProps } from "@/lib/types";

const hideImage = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.hidden = true;
};

const BookCover = ({ coverId, title, author, sizes }: BookCoverProps) => (
  <div
    role="img"
    aria-label={`Cover of ${title}`}
    className="relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg"
  >
    <div
      aria-hidden="true"
      className="glass glass--flat flex h-full flex-col justify-end gap-1 rounded-sm p-3"
    >
      <p className="line-clamp-3 font-display text-sm text-ink-1">{title}</p>
      <p className="text-xs text-ink-3">{author}</p>
    </div>
    <Image
      src={`${OPEN_LIBRARY_COVER_URL}/${coverId}-L.jpg`}
      alt=""
      fill
      sizes={sizes}
      className="object-cover"
      onError={hideImage}
    />
  </div>
);

export default BookCover;
