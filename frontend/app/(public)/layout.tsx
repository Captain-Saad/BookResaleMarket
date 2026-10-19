import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import { NAV_LINKS, SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";

const PublicLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <>
    <SiteHeader siteName={SITE_NAME} navLinks={NAV_LINKS} />
    {children}
    <SiteFooter siteName={SITE_NAME} description={SITE_DESCRIPTION} />
  </>
);

export default PublicLayout;
