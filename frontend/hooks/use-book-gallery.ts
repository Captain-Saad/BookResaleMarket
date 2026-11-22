import { useState } from "react";
import useDialog from "@/hooks/use-dialog";
import type { PublicBookDetail } from "@/lib/types";

const useBookGallery = (book: PublicBookDetail) => {
  const [index, setIndex] = useState(0);
  const { dialogRef, open, close } = useDialog();
  return {
    photo: book.photos[index] ?? book.photos[0],
    dialogRef,
    open,
    close,
    index,
    select: (value: number) => () => setIndex(value),
  };
};
export default useBookGallery;
