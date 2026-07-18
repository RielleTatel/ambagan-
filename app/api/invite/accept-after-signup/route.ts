import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { decryptSecret, addGroupSignerAndUpdateThreshold } from '@/lib/stellar'
import { computeThreshold } from '@/lib/group-threshold'

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string }
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_public_key) {
    return NextResponse.json({ error: 'wallet not provisioned' }, { status: 400 })
  }

  const { data: group } = await supabase
    .from('groups')
    .select('id, vote_threshold, stellar_secret_encrypted, invite_active, admin_id')
    .eq('invite_token', token)
    .single()
  if (!group || !group.invite_active) {
    return NextResponse.json({ error: 'invite invalid' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return NextResponse.json({ groupId: group.id })

  const { error: insertErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const { count } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  const memberCount = count ?? 1
  const newThreshold = computeThreshold(group.vote_threshold, memberCount)

  try {
    if (!group.stellar_secret_encrypted) throw new Error('group missing stellar')
    const groupSecret = decryptSecret(group.stellar_secret_encrypted)
    let adminSecret: string | undefined
    if (memberCount > 2) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
      )
      const { data: adminProfile } = await adminClient
        .from('profiles')
        .select('stellar_secret_encrypted')
        .eq('id', group.admin_id)
        .single()
      if (adminProfile?.stellar_secret_encrypted) {
        adminSecret = decryptSecret(adminProfile.stellar_secret_encrypted)
      }
    }
    await addGroupSignerAndUpdateThreshold(
      groupSecret,
      profile.stellar_public_key,
      newThreshold,
      adminSecret,
    )
  } catch (e) {
    console.error('[accept-after-signup] Stellar sync failed', e)
  }

  return NextResponse.json({ groupId: group.id })
}
