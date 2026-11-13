import type { Metadata } from "next";
import ListingWizard from "@/components/domain/listing-wizard";
import { LISTING_COPY } from "@/lib/constants";
export const metadata: Metadata = { title: LISTING_COPY.title };
const SellPage = () => <ListingWizard copy={LISTING_COPY} />;
export default SellPage;
