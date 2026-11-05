import BottomTabBar from "@/components/layout/bottom-tab-bar";
import SiteFooter from "@/components/layout/site-footer";
import SiteHeader from "@/components/layout/site-header";
import type { AppShellProps } from "@/lib/types";

const AppShell = ({
  siteName,
  description,
  homeHref,
  searchHref,
  navItems,
  labels,
  themeToggleLabel,
  children,
}: AppShellProps) => (
  <>
    <div className="flex min-h-dvh flex-col pb-24 md:pb-0">
      <SiteHeader
        siteName={siteName}
        homeHref={homeHref}
        searchHref={searchHref}
        navLinks={navItems}
        labels={labels}
        themeToggleLabel={themeToggleLabel}
      />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter siteName={siteName} description={description} />
    </div>
    <BottomTabBar navItems={navItems} label={labels.main} />
  </>
);

export default AppShell;
