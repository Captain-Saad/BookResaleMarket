import { SITE_NAME, SITE_TAGLINE } from "@/lib/constants";

const HomePage = () => (
  <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
    <h1 className="text-5xl font-semibold tracking-tight">{SITE_NAME}</h1>
    <p className="max-w-md text-lg">{SITE_TAGLINE}</p>
  </main>
);

export default HomePage;
