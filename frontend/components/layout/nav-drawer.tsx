"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useId } from "react";
import useDialog from "@/hooks/use-dialog";
import type { NavDrawerProps } from "@/lib/types";

const NavDrawer = ({ navLinks, labels }: NavDrawerProps) => {
  const { dialogRef, open, close } = useDialog();
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={labels.openMenu}
        aria-haspopup="dialog"
        className="hidden size-11 items-center justify-center rounded-full text-ink-1 transition-colors hover:bg-glass-3 md:inline-flex lg:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="glass glass--3 fixed inset-y-3 start-auto end-3 m-0 h-auto max-h-none w-72 p-4 text-ink-1 backdrop:bg-scrim"
      >
        <div className="flex items-center justify-between">
          <p id={titleId} className="font-display text-h3">
            {labels.menuTitle}
          </p>
          <button
            type="button"
            onClick={close}
            aria-label={labels.closeMenu}
            className="inline-flex size-11 items-center justify-center rounded-full transition-colors hover:bg-glass-3"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>
        <nav aria-label={labels.main} className="mt-4">
          <ul className="flex flex-col gap-1">
            {navLinks.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={close}
                  className="flex min-h-11 items-center rounded-md px-3 font-medium text-ink-2 transition-colors hover:bg-glass-3 hover:text-ink-1"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
};

export default NavDrawer;
