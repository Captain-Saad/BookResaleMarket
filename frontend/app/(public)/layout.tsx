import BottomTabBar from "@/components/layout/bottom-tab-bar";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import {
  NAV_LABELS,
  PRIMARY_NAV,
  ROUTES,
  SITE_DESCRIPTION,
  SITE_NAME,
  THEME_TOGGLE_LABEL,
} from "@/lib/constants";
import type { ChildrenProps } from "@/lib/types";

const PublicLayout = ({ children }: ChildrenProps) => (
  <>
    <div className="pb-24 md:pb-0">
      <SiteHeader
        siteName={SITE_NAME}
        homeHref={ROUTES.home}
        searchHref={ROUTES.books}
        navLinks={PRIMARY_NAV}
        labels={NAV_LABELS}
        themeToggleLabel={THEME_TOGGLE_LABEL}
      />
      {children}
      <SiteFooter siteName={SITE_NAME} description={SITE_DESCRIPTION} />
    </div>
    <BottomTabBar navItems={PRIMARY_NAV} label={NAV_LABELS.main} />
  </>
);

export default PublicLayout;
