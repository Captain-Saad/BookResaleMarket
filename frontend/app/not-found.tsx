import AppShell from "@/components/layout/app-shell";
import PlaceholderPage from "@/components/layout/placeholder-page";
import { APP_SHELL, BACK_HOME_LINK, PLACEHOLDER_PAGES } from "@/lib/constants";

const NotFound = () => (
  <AppShell {...APP_SHELL}>
    <PlaceholderPage
      title={PLACEHOLDER_PAGES.notFound.title}
      description={PLACEHOLDER_PAGES.notFound.description}
      homeLink={BACK_HOME_LINK}
    />
  </AppShell>
);

export default NotFound;
