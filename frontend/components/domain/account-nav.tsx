"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AccountNavProps } from "@/lib/types";

const AccountNav = ({ label, links }: AccountNavProps) => {
  const pathname = usePathname();

  return (
    <nav aria-label={label}>
      <ul className="flex flex-wrap gap-1">
        {links.map(({ href, label: linkLabel }) => (
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
  );
};

export default AccountNav;
