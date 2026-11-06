"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/button";
import useAccountNav from "@/hooks/use-account-nav";
import type { AccountNavProps } from "@/lib/types";

const AccountNav = ({ label, links, roleLinks, signOutLabel }: AccountNavProps) => {
  const pathname = usePathname();
  const { roles, signOut } = useAccountNav();
  const visibleLinks = [...links, ...roleLinks.filter(({ role }) => roles.includes(role))];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <nav aria-label={label}>
        <ul className="flex flex-wrap gap-1">
          {visibleLinks.map(({ href, label: linkLabel }) => (
            <li key={href}>
              <Link
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium transition-colors hover:text-ink-1 ${pathname === href ? "bg-glass-3 text-ink-1" : "text-ink-2"}`}
              >
                {linkLabel}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <Button variant="ghost" onClick={signOut}>
        {signOutLabel}
      </Button>
    </div>
  );
};

export default AccountNav;
