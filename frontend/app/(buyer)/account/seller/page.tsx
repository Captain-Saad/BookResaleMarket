import type { Metadata } from "next";
import SellerPanel from "@/components/domain/seller-panel";
import { SELLER_PANEL_COPY } from "@/lib/constants";

export const metadata: Metadata = { title: SELLER_PANEL_COPY.title };

const SellerPage = () => <SellerPanel copy={SELLER_PANEL_COPY} />;

export default SellerPage;
