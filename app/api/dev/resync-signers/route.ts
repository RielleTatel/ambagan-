import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decryptSecret, resyncGroupSigners } from '@/lib/stellar'
import { computeThreshold } from '@/lib/group-threshold'
import type { VoteThreshold } from '@/lib/group-threshold'

// DEV ONLY — re-register all members as Stellar signers on the group account.
// Hit: POST /api/dev/resync-signers  body: { groupId }
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { groupId } = await req.json()
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: group } = await adminClient
    .from('groups')
    .select('id, vote_threshold, stellar_secret_encrypted, admin_id')
    .eq('id', groupId)
    .single()

  if (!group?.stellar_secret_encrypted) {
    return NextResponse.json({ error: 'Group has no Stellar account' }, { status: 400 })
  }

  const { data: members } = await adminClient
    .from('group_members')
    .select('user_id, profiles:user_id(stellar_public_key)')
    .eq('group_id', groupId)

  const memberPublicKeys = (members ?? [])
    .map((m: any) => m.profiles?.stellar_public_key)
    .filter(Boolean) as string[]

  const threshold = computeThreshold(
    group.vote_threshold as VoteThreshold,
    memberPublicKeys.length,
  )

  const { data: adminProfile } = await adminClient
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', group.admin_id)
    .single()

  const groupSecret = decryptSecret(group.stellar_secret_encrypted)
  const adminSecret = adminProfile?.stellar_secret_encrypted
    ? decryptSecret(adminProfile.stellar_secret_encrypted)
    : undefined

  try {
    const result = await resyncGroupSigners(groupSecret, memberPublicKeys, threshold, adminSecret)
    return NextResponse.json({ ok: true, hash: result.hash, threshold, signers: memberPublicKeys.length })
  } catch (err: any) {
    const codes = err?.response?.data?.extras?.result_codes
    return NextResponse.json({ error: codes ?? err.message }, { status: 500 })
  }
}
