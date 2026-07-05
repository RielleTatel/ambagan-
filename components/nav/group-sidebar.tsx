import { LayoutDashboard, HandCoins, ScrollText, Calendar, Settings, AlertTriangle, FileDown } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { NavItem } from "./nav-item";

type GroupSidebarProps = {
  groupId: string;
};

export async function GroupSidebar({ groupId }: GroupSidebarProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, description, admin_id")
    .eq("id", groupId)
    .single();

  if (!group) return null;

  const isAdmin = user?.id === group.admin_id;

  const initial = group.name.charAt(0).toUpperCase();

  return (
    <aside className="flex h-screen w-64 flex-col border-r-2 border-border-default bg-neutral-primary px-3 py-4">
      <div className="mb-6 flex items-start gap-3 rounded-[12px] border-2 border-border-default bg-warm-bg p-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-softer text-sm font-bold text-fg-brand">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-heading">{group.name}</div>
          {group.description && (
            <div className="truncate text-xs text-body-subtle">{group.description}</div>
          )}
          {isAdmin && (
            <span className="mt-1 inline-block rounded-full bg-accent-softer px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg-accent">
              Admin
            </span>
          )}
        </div>
      </div>

      <NavSection label="Overview">
        <NavItem href={`/groups/${groupId}`} label="Dashboard" icon={LayoutDashboard} exact />
        <NavItem href={`/groups/${groupId}/loans`} label="Loans" icon={HandCoins} />
      </NavSection>

      <NavSection label="History">
        <NavItem href={`/groups/${groupId}/ledger`} label="Ledger" icon={ScrollText} />
        <NavItem href={`/groups/${groupId}/repayments`} label="Repayments" icon={Calendar} />
      </NavSection>

      {isAdmin && (
        <NavSection label="Admin">
          <NavItem href={`/groups/${groupId}/admin`} label="Settings" icon={Settings} exact />
          <NavItem href={`/groups/${groupId}/admin/defaults`} label="Defaults" icon={AlertTriangle} />
          <NavItem href={`/groups/${groupId}/admin/export`} label="Export" icon={FileDown} />
        </NavSection>
      )}
    </aside>
  );
}

function NavSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.6px] text-body-subtle">
        {label}
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
