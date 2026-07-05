"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type NavItemProps = {
  href: string;
  label: string;
  icon?: ReactNode;
  exact?: boolean;
  badge?: string | number;
};

export function NavItem({ href, label, icon, exact, badge }: NavItemProps) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-[12px] border-2 border-transparent px-3 py-3 text-sm font-bold uppercase tracking-[0.6px] transition-colors duration-100 [&_svg]:h-[22px] [&_svg]:w-[22px] [&_svg]:transition-colors [&_svg]:duration-75",
        active
          ? "border-border-brand-subtle bg-brand-softer text-fg-brand-strong [&_svg]:text-fg-brand"
          : "text-heading [&_svg]:text-body hover:bg-brand-softer hover:[&_svg]:text-fg-brand",
      )}
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge != null && (
        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </Link>
  );
}
