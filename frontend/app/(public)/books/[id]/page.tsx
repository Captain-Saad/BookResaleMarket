import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListingDetail from "@/components/domain/listing-detail";
import { getPublicBook } from "@/lib/api/catalog-server";
import { PublicRequestError } from "@/lib/api/catalog";
import { DETAIL_COPY } from "@/lib/constants";
import { bookMetadata, bookUrl } from "@/lib/seo";
import type { PublicBookPageProps } from "@/lib/types";

export const generateMetadata = async ({ params }: PublicBookPageProps): Promise<Metadata> => {
  const { id } = await params;
  try {
    return bookMetadata(await getPublicBook(id), bookUrl(id));
  } catch (error) {
    if (error instanceof PublicRequestError && (error.status === 404 || error.status === 422))
      notFound();
    return { title: DETAIL_COPY.unavailableTitle, robots: { index: false, follow: true } };
  }
};
const BookPage = async ({ params }: PublicBookPageProps) => {
  const { id } = await params;
  let initial;
  try {
    initial = await getPublicBook(id);
  } catch (error) {
    if (error instanceof PublicRequestError && (error.status === 404 || error.status === 422))
      notFound();
  }
  return (
    <ListingDetail
      key={id}
      id={id}
      copy={DETAIL_COPY}
      initial={initial}
      canonicalUrl={bookUrl(id)}
    />
  );
};
export default BookPage;
