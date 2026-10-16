import type { ReactNode } from "react";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";

const PublicLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <>
    <SiteHeader />
    {children}
    <SiteFooter />
  </>
);

export default PublicLayout;
