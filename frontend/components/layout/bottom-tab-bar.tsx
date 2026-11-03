"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ICONS } from "@/lib/constants";
import type { BottomTabBarProps } from "@/lib/types";

const BottomTabBar = ({ navItems, label }: BottomTabBarProps) => {
  const pathname = usePathname();

  return (
    <nav
      aria-label={label}
      className="glass glass--2 fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-20 md:hidden"
    >
      <ul className="grid grid-cols-4">
        {navItems.map(({ id, href, label }) => {
          const Icon = NAV_ICONS[id];
          const isActive = pathname === href;
          return (
            <li key={id}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium ${isActive ? "text-ink-1" : "text-ink-3"}`}
              >
                <Icon aria-hidden="true" className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default BottomTabBar;
