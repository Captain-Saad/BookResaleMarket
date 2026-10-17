import type { Metadata } from "next";
import PlaceholderPage from "@/components/layout/placeholder-page";
import { BACK_HOME_LINK, PLACEHOLDER_PAGES } from "@/lib/constants";

const { title, description } = PLACEHOLDER_PAGES.orders;

export const metadata: Metadata = { title };

const OrdersPage = () => (
  <PlaceholderPage title={title} description={description} homeLink={BACK_HOME_LINK} />
);

export default OrdersPage;
