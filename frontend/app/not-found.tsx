import PlaceholderPage from "@/components/layout/placeholder-page";
import { BACK_HOME_LINK, PLACEHOLDER_PAGES } from "@/lib/constants";

const NotFound = () => (
  <PlaceholderPage
    title={PLACEHOLDER_PAGES.notFound.title}
    description={PLACEHOLDER_PAGES.notFound.description}
    homeLink={BACK_HOME_LINK}
  />
);

export default NotFound;
