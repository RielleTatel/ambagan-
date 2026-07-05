"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type IconNavItemProps = {
  href: string;
  label: string;
  icon?: LucideIcon;
  initial?: string;
  exact?: boolean;
};

/**
 * Icon-only nav item for the outer sidebar (64px column).
 * Either an icon (Lucide) or an initial character (for group avatars).
 */
export function IconNavItem({ href, label, icon: Icon, initial, exact }: IconNavItemProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-[12px] border-2 border-transparent transition-colors duration-100",
        active
          ? "border-border-brand-subtle bg-brand-softer text-fg-brand"
          : "text-body hover:bg-brand-softer hover:text-fg-brand",
      )}
    >
      {Icon ? (
        <Icon className="h-[22px] w-[22px]" />
      ) : (
        <span className="text-sm font-bold">{initial}</span>
      )}
    </Link>
  );
}
