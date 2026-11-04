import type { Metadata, Viewport } from "next";
import DevTools from "@/components/dev/dev-tools";
import AuroraStage from "@/components/stage/aurora-stage";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/theme";
import { type ChildrenProps, Theme } from "@/lib/types";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
};

export const viewport: Viewport = { viewportFit: "cover" };

const RootLayout = ({ children }: ChildrenProps) => (
  <html lang="en" data-theme={Theme.Dark} className={fontVariables} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
    </head>
    <body className="min-h-dvh antialiased">
      <AuroraStage />
      {children}
      {process.env.NODE_ENV !== "production" && <DevTools />}
    </body>
  </html>
);

export default RootLayout;
