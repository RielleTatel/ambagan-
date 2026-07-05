"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItemProps = {
  href: string;
  label: string;
  icon?: LucideIcon;
  exact?: boolean;
  badge?: string | number;
};

export function NavItem({ href, label, icon: Icon, exact, badge }: NavItemProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-[12px] border-2 border-transparent px-3 py-3 text-sm font-bold uppercase tracking-[0.6px] text-heading transition-colors duration-100",
        active
          ? "border-border-brand-subtle bg-brand-softer text-fg-brand-strong"
          : "hover:bg-brand-softer",
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            "h-[22px] w-[22px] transition-colors duration-75",
            active ? "text-fg-brand" : "text-body group-hover:text-fg-brand",
          )}
        />
      )}
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
