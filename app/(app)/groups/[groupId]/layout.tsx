import { Suspense } from "react";
import { GroupSidebar } from "@/components/nav/group-sidebar";

function GroupSidebarSkeleton() {
  return (
    <aside className="h-screen w-64 shrink-0 border-r-2 border-border-default bg-neutral-primary" />
  );
}

export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;

  return (
    <div className="flex flex-1">
      <Suspense fallback={<GroupSidebarSkeleton />}>
        <GroupSidebar groupId={groupId} />
      </Suspense>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
