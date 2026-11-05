import AccountNav from "@/components/domain/account-nav";
import BottomTabBar from "@/components/layout/bottom-tab-bar";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import {
  ACCOUNT_NAV,
  NAV_LABELS,
  PRIMARY_NAV,
  ROUTES,
  SITE_DESCRIPTION,
  SITE_NAME,
  THEME_TOGGLE_LABEL,
} from "@/lib/constants";
import type { ChildrenProps } from "@/lib/types";

const AccountLayout = ({ children }: ChildrenProps) => (
  <>
    <div className="pb-24 md:pb-0">
      <SiteHeader
        siteName={SITE_NAME}
        homeHref={ROUTES.home}
        searchHref={ROUTES.search}
        navLinks={PRIMARY_NAV}
        labels={NAV_LABELS}
        themeToggleLabel={THEME_TOGGLE_LABEL}
      />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
        <AccountNav label={ACCOUNT_NAV.label} links={ACCOUNT_NAV.links} />
        {children}
      </main>
      <SiteFooter siteName={SITE_NAME} description={SITE_DESCRIPTION} />
    </div>
    <BottomTabBar navItems={PRIMARY_NAV} label={NAV_LABELS.main} />
  </>
);

export default AccountLayout;
