import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { UserSidebar } from "@/components/nav/user-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-svh bg-warm-bg">
      <UserSidebar />
      <div className="flex flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
