import { Home, Plus, Bell, Settings, User } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { IconNavItem } from "./icon-nav-item";

export async function UserSidebar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = user
    ? await supabase
        .from("group_members")
        .select("group:groups(id, name)")
        .eq("user_id", user.id)
    : { data: null };

  const groups = (memberships ?? [])
    .map(
      (m) =>
        (m as unknown as { group: { id: string; name: string } | null }).group,
    )
    .filter((g): g is NonNullable<typeof g> => g != null);

  return (
    <aside className="flex h-full w-16 flex-col items-center border-r-2 border-border-default bg-neutral-primary py-4">
      <div className="flex flex-col items-center gap-2">
        <IconNavItem href="/dashboard" label="Home" icon={<Home />} exact />
      </div>

      {groups.length > 0 && (
        <>
          <div className="my-4 h-0.5 w-8 rounded-full bg-border-default" />
          <div className="flex flex-1 flex-col items-center gap-2 overflow-y-auto">
            {groups.map((g) => (
              <IconNavItem
                key={g.id}
                href={`/groups/${g.id}`}
                label={g.name}
                initial={g.name.charAt(0).toUpperCase()}
              />
            ))}
            <IconNavItem href="/groups/new" label="Create a group" icon={<Plus />} exact />
          </div>
        </>
      )}

      <div className="mt-auto flex flex-col items-center gap-2 pt-4">
        <IconNavItem href="/notifications" label="Notifications" icon={<Bell />} />
        <IconNavItem href="/profile" label="Profile" icon={<User />} />
        <IconNavItem href="/settings" label="Settings" icon={<Settings />} />
      </div>
    </aside>
  );
}
