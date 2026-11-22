import type { Metadata } from "next";
import BooksCatalog from "@/components/domain/books-catalog";
import { CATALOG_COPY } from "@/lib/constants";
export const metadata: Metadata = {
  title: CATALOG_COPY.search,
  description: CATALOG_COPY.description,
};
const BooksPage = () => <BooksCatalog copy={CATALOG_COPY} />;
export default BooksPage;
