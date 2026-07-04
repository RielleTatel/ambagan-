import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createCustodialAccount } from "@/lib/stellar-user";

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  // Idempotency — if a wallet already exists on this profile, don't re-provision.
  const { data: existing } = await supabase
    .from("profiles")
    .select("stellar_public_key")
    .eq("id", user.id)
    .single();

  if (existing?.stellar_public_key) {
    return NextResponse.json({
      publicKey: existing.stellar_public_key,
      alreadyProvisioned: true,
    });
  }

  const { publicKey, encryptedSecret } = await createCustodialAccount();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      stellar_public_key: publicKey,
      stellar_secret_encrypted: encryptedSecret,
      is_custodial: true,
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: `Failed to save wallet: ${updateError.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ publicKey });
}
