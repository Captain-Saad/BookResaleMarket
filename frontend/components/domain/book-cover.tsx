"use client";

import Image from "next/image";
import { useState } from "react";
import { OPEN_LIBRARY_COVER_URL } from "@/lib/constants";

type BookCoverProps = {
  coverId: number;
  title: string;
  author: string;
  sizes: string;
};

const BookCover = ({ coverId, title, author, sizes }: BookCoverProps) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-[2/3] overflow-hidden rounded-sm shadow-lg">
      {failed ? (
        <div
          role="img"
          aria-label={`Cover of ${title}`}
          className="glass glass--flat flex h-full flex-col justify-end gap-1 rounded-sm p-3"
        >
          <p className="line-clamp-3 font-display text-sm text-ink-1">{title}</p>
          <p className="text-xs text-ink-3">{author}</p>
        </div>
      ) : (
        <Image
          src={`${OPEN_LIBRARY_COVER_URL}/${coverId}-L.jpg`}
          alt={`Cover of ${title}`}
          fill
          sizes={sizes}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
};

export default BookCover;
