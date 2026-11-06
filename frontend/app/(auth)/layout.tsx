import Link from "next/link";
import { ROUTES, SITE_NAME } from "@/lib/constants";
import type { ChildrenProps } from "@/lib/types";

const AuthLayout = ({ children }: ChildrenProps) => (
  <>
    <header className="flex justify-center px-4 pt-6">
      <Link
        href={ROUTES.home}
        className="inline-flex min-h-11 items-center font-display text-h3 font-semibold text-ink-1"
      >
        {SITE_NAME}
      </Link>
    </header>
    {children}
  </>
);

export default AuthLayout;
