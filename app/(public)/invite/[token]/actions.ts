'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, addGroupSignerAndUpdateThreshold } from '@/lib/stellar'
import { computeThreshold } from '@/lib/group-threshold'

export type AcceptResult = { error: string } | { groupId: string }

export async function acceptInvite(token: string): Promise<AcceptResult> {
  if (!token) return { error: 'Missing invite token.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/register?invite=${encodeURIComponent(token)}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_public_key) {
    redirect(`/onboarding/wallet?invite=${encodeURIComponent(token)}`)
  }

  const { data: group } = await supabase
    .from('groups')
    .select('id, vote_threshold, stellar_secret_encrypted, invite_active, admin_id')
    .eq('invite_token', token)
    .single()

  if (!group || !group.invite_active) return { error: 'This invite is no longer valid.' }

  // Already a member? Redirect to the group instead of erroring.
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) redirect(`/groups/${group.id}`)

  // Insert the member row first (source of truth for RLS).
  const { error: insertErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })
  if (insertErr) return { error: insertErr.message }

  // Recompute threshold based on new member count and apply on-chain.
  const { count } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  const memberCount = count ?? 1
  const newThreshold = computeThreshold(group.vote_threshold, memberCount)

  try {
    if (!group.stellar_secret_encrypted) throw new Error('Group has no Stellar account.')
    const groupSecret = decryptSecret(group.stellar_secret_encrypted)

    // If the pre-join threshold was > 1, the master alone can't sign — pull the
    // admin's secret too (Phase 2 shortcut; Phase 4 replaces with real multisig).
    let adminSecret: string | undefined
    if (memberCount > 2) {
      const { data: adminProfile } = await supabase
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
    // Trade-off documented in the spec: keep the DB row, log the chain failure.
    console.error('[acceptInvite] Stellar signer sync failed', e)
  }

  redirect(`/groups/${group.id}`)
}
