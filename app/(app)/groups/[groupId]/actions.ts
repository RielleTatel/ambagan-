'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, sendAMBPHP } from '@/lib/stellar'
import { computeCurrentCycle, computeCycleDueDate, type Cadence } from '@/lib/cycles'
import { recomputeCreditScore } from '@/lib/credit-inputs'

export async function submitContribution(
  groupId: string,
): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id, contribution_streak')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member of this group' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, stellar_account_id, contribution_amount, cadence, created_at, cycle_status')
    .eq('id', groupId)
    .single()
  if (!group || !group.stellar_account_id) {
    return { ok: false, error: 'Group not found or missing Stellar account' }
  }
  if (group.cycle_status === 'closed') {
    return { ok: false, error: 'Cycle is closed to new contributions' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_secret_encrypted) {
    return { ok: false, error: 'Wallet not provisioned' }
  }

  const cadence = group.cadence as Cadence
  const groupCreated = new Date(group.created_at)
  const cycleNumber = computeCurrentCycle(groupCreated, cadence)
  const dueDate = computeCycleDueDate(groupCreated, cadence, cycleNumber)

  const { data: existing } = await supabase
    .from('contributions')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('cycle_number', cycleNumber)
    .eq('contribution_type', 'required')
    .eq('status', 'confirmed')
    .maybeSingle()
  if (existing) return { ok: false, error: 'Already contributed this cycle' }

  let txHash: string
  try {
    const secret = decryptSecret(profile.stellar_secret_encrypted)
    const result = await sendAMBPHP(
      secret,
      group.stellar_account_id,
      String(group.contribution_amount),
    )
    txHash = result.hash
  } catch (err) {
    return { ok: false, error: `Stellar payment failed: ${(err as Error).message}` }
  }

  const { error: insertErr } = await supabase.from('contributions').insert({
    group_id: groupId,
    user_id: user.id,
    amount: group.contribution_amount,
    contribution_type: 'required',
    cycle_number: cycleNumber,
    stellar_tx_hash: txHash,
    status: 'confirmed',
    due_date: dueDate.toISOString().slice(0, 10),
    paid_at: new Date().toISOString(),
  })
  if (insertErr) return { ok: false, error: `DB insert failed: ${insertErr.message}` }

  await supabase
    .from('group_members')
    .update({
      contribution_streak: (membership.contribution_streak ?? 0) + 1,
      total_contributed: group.contribution_amount,
    })
    .eq('id', membership.id)

  revalidatePath(`/groups/${groupId}`)
  await recomputeCreditScore(user.id).catch(() => undefined)
  return { ok: true, txHash }
}

export async function submitInvestment(
  groupId: string,
  amount: number,
): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return { ok: false, error: 'Investment must be between 0 and 1,000,000' }
  }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member of this group' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, stellar_account_id, cycle_status')
    .eq('id', groupId)
    .single()
  if (!group?.stellar_account_id) {
    return { ok: false, error: 'Group not found or missing Stellar account' }
  }
  if (group.cycle_status === 'closed') {
    return { ok: false, error: 'Cycle is closed to new investments' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_secret_encrypted) {
    return { ok: false, error: 'Wallet not provisioned' }
  }

  let txHash: string
  try {
    const secret = decryptSecret(profile.stellar_secret_encrypted)
    const result = await sendAMBPHP(
      secret,
      group.stellar_account_id,
      String(amount),
    )
    txHash = result.hash
  } catch (err) {
    return { ok: false, error: `Stellar payment failed: ${(err as Error).message}` }
  }

  const { error: insertErr } = await supabase.from('contributions').insert({
    group_id: groupId,
    user_id: user.id,
    amount,
    contribution_type: 'optional',
    cycle_number: null,
    stellar_tx_hash: txHash,
    status: 'confirmed',
    due_date: null,
    paid_at: new Date().toISOString(),
  })
  if (insertErr) return { ok: false, error: `DB insert failed: ${insertErr.message}` }

  revalidatePath(`/groups/${groupId}`)
  return { ok: true, txHash }
}
