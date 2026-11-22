import type { PublicBookPageProps } from "@/lib/types";
import ListingDetail from "@/components/domain/listing-detail";
import { DETAIL_COPY } from "@/lib/constants";
const BookPage = async ({ params }: PublicBookPageProps) => {
  const { id } = await params;
  return <ListingDetail key={id} id={id} copy={DETAIL_COPY} />;
};
export default BookPage;
