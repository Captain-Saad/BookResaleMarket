"use client";

import Image from "next/image";
import type { SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { OPEN_LIBRARY_COVER_URL } from "@/lib/constants";
import { CoverFit, type BookCoverProps } from "@/lib/types";

const hideImage = (event: SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.hidden = true;
};

const BookCover = ({
  coverId,
  src,
  label,
  title,
  author,
  sizes,
  fit = CoverFit.Cover,
  className,
}: BookCoverProps) => (
  <div
    role="img"
    aria-label={label ?? title}
    className={cn("relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg", className)}
  >
    <div
      aria-hidden="true"
      className="glass glass--flat flex h-full flex-col justify-end gap-1 rounded-sm p-3"
    >
      <p className="line-clamp-3 font-display text-sm text-ink-1">{title}</p>
      <p className="text-xs text-ink-3">{author}</p>
    </div>
    {(src || coverId) && (
      <Image
        key={src ?? coverId}
        src={src || `${OPEN_LIBRARY_COVER_URL}/${coverId}-L.jpg`}
        unoptimized={!!src}
        alt=""
        fill
        sizes={sizes}
        className={fit === CoverFit.Contain ? "bg-bg-1 object-contain" : "object-cover"}
        onError={hideImage}
      />
    )}
  </div>
);

export default BookCover;
