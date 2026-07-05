"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type IconNavItemProps = {
  href: string;
  label: string;
  icon?: ReactNode;
  initial?: string;
  exact?: boolean;
};

/**
 * Icon-only nav item for the outer sidebar (64px column).
 * Either a pre-rendered icon node or an initial character (for group avatars).
 */
export function IconNavItem({ href, label, icon, initial, exact }: IconNavItemProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-transparent transition-colors duration-100 [&_svg]:h-[22px] [&_svg]:w-[22px]",
        active
          ? "border-border-brand-subtle bg-brand-softer text-fg-brand"
          : "text-body hover:bg-brand-softer hover:text-fg-brand",
      )}
    >
      {icon ?? <span className="text-sm font-bold">{initial}</span>}
    </Link>
  );
}
