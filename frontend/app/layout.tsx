import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuroraStage from "@/components/stage/aurora-stage";
import ThemeToggle from "@/components/theme/theme-toggle";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/theme";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
};

const RootLayout = ({ children }: Readonly<{ children: ReactNode }>) => (
  <html lang="en" data-theme="dark" className={fontVariables} suppressHydrationWarning>
    <head>
      <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
    </head>
    <body className="min-h-dvh antialiased">
      <AuroraStage />
      <ThemeToggle />
      {children}
    </body>
  </html>
);

export default RootLayout;
