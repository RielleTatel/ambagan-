import { GroupSidebar } from "@/components/nav/group-sidebar";

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
      <GroupSidebar groupId={groupId} />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
