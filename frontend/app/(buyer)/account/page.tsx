import type { Metadata } from "next";
import ProfileForm from "@/components/domain/profile-form";
import { PROFILE_FORM_COPY } from "@/lib/constants";

export const metadata: Metadata = { title: PROFILE_FORM_COPY.title };

const AccountPage = () => <ProfileForm copy={PROFILE_FORM_COPY} />;

export default AccountPage;
