import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { WalletProvisioner } from "./wallet-provisioner";

export default async function WalletOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stellar_public_key")
    .eq("id", user.id)
    .single();

  if (profile?.stellar_public_key) {
    redirect(invite ? `/invite/${invite}` : "/dashboard");
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <WalletProvisioner inviteToken={invite} />
    </main>
  );
}
