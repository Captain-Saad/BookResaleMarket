import { useState } from "react";
import type { PublicBookDetail } from "@/lib/types";

const useBookGallery = (book: PublicBookDetail) => {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  return {
    photo: book.photos[index] ?? book.photos[0],
    zoom,
    setZoom,
    index,
    select: (value: number) => () => setIndex(value),
  };
};
export default useBookGallery;
