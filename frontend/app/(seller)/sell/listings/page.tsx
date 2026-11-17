import type { Metadata } from "next";
import MyListings from "@/components/domain/my-listings";
import { LISTING_COPY } from "@/lib/constants";
export const metadata: Metadata = { title: LISTING_COPY.myListings };
const MyListingsPage = () => <MyListings copy={LISTING_COPY} />;
export default MyListingsPage;
