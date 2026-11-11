import type { Metadata } from "next";
import AddressManager from "@/components/domain/address-manager";
import { ADDRESS_MANAGER_COPY } from "@/lib/constants";

export const metadata: Metadata = { title: ADDRESS_MANAGER_COPY.title };

const AddressesPage = () => <AddressManager copy={ADDRESS_MANAGER_COPY} />;

export default AddressesPage;
