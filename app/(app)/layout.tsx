import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { UserSidebar } from "@/components/nav/user-sidebar";

async function AuthGate({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <>{children}</>;
}

function UserSidebarSkeleton() {
  return (
    <aside className="h-screen w-16 shrink-0 border-r-2 border-border-default bg-neutral-primary" />
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh bg-warm-bg">
      <Suspense fallback={<UserSidebarSkeleton />}>
        <UserSidebar />
      </Suspense>
      <Suspense fallback={null}>
        <AuthGate>
          <div className="flex flex-1 overflow-hidden">{children}</div>
        </AuthGate>
      </Suspense>
    </div>
  );
}
