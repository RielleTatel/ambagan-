'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import {
  decryptSecret,
  distributePot,
  getAMBPHPBalance,
} from '@/lib/stellar'
import { computeOwnership, type MemberContribution } from '@/lib/ownership'
import { computeCyclePayouts } from '@/lib/cycle-distribution'

export async function endCycleAndDistribute(
  groupId: string,
): Promise<
  | { ok: true; txHash: string; payoutCount: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: group } = await supabase
    .from('groups')
    .select(
      'id, admin_id, name, stellar_account_id, stellar_secret_encrypted, current_cycle_number, cycle_status',
    )
    .eq('id', groupId)
    .single()
  if (!group) return { ok: false, error: 'Group not found' }
  if (group.admin_id !== user.id)
    return { ok: false, error: 'Only the group admin can end the cycle' }
  if (group.cycle_status === 'closed')
    return { ok: false, error: 'Cycle is already closed' }
  if (!group.stellar_account_id || !group.stellar_secret_encrypted)
    return { ok: false, error: 'Group Stellar account not provisioned' }

  const { data: contribs } = await supabase
    .from('contributions')
    .select('user_id, amount, profiles:user_id(stellar_public_key)')
    .eq('group_id', groupId)
    .eq('status', 'confirmed')

  const byUser = new Map<
    string,
    { userId: string; totalContributed: number; destination: string }
  >()
  for (const c of contribs ?? []) {
    const uid = c.user_id as string
    const dest = ((c as any).profiles?.stellar_public_key as string) ?? ''
    const existing = byUser.get(uid) ?? {
      userId: uid,
      totalContributed: 0,
      destination: dest,
    }
    existing.totalContributed += Number(c.amount)
    if (dest) existing.destination = dest
    byUser.set(uid, existing)
  }

  const eligible = Array.from(byUser.values()).filter(
    (v) => v.totalContributed > 0 && v.destination,
  )
  if (eligible.length === 0)
    return { ok: false, error: 'No eligible members with contributions' }

  const members: MemberContribution[] = eligible.map((v) => ({
    userId: v.userId,
    totalContributed: v.totalContributed,
  }))
  const ownership = computeOwnership(members)

  const balanceStr = await getAMBPHPBalance(group.stellar_account_id).catch(
    () => '0',
  )
  const totalFund = Number(balanceStr)
  if (!(totalFund > 0))
    return { ok: false, error: 'Group has no distributable balance' }

  const payouts = computeCyclePayouts(totalFund, ownership)
  if (payouts.length === 0)
    return { ok: false, error: 'No payouts computed' }

  const destinationByUser = new Map(eligible.map((v) => [v.userId, v.destination]))
  const stellarPayouts = payouts
    .filter((p) => p.amount > 0)
    .map((p) => ({
      destination: destinationByUser.get(p.userId)!,
      amount: p.amount.toFixed(2),
    }))
  if (stellarPayouts.length === 0)
    return { ok: false, error: 'All payouts were zero' }

  let txHash: string
  try {
    const secret = decryptSecret(group.stellar_secret_encrypted)
    const result = await distributePot(secret, stellarPayouts)
    txHash = result.hash
  } catch (err) {
    return {
      ok: false,
      error: `Stellar distribution failed: ${(err as Error).message}`,
    }
  }

  const ownershipByUser = new Map(ownership.map((r) => [r.userId, r]))
  const distributionRows = payouts.map((p) => ({
    group_id: groupId,
    cycle_number: group.current_cycle_number,
    member_id: p.userId,
    total_contributed: ownershipByUser.get(p.userId)!.totalContributed,
    ownership_pct: ownershipByUser.get(p.userId)!.ownershipPct,
    payout_amount: p.amount,
    stellar_tx_hash: txHash,
  }))
  await supabase.from('cycle_distributions').insert(distributionRows)

  await supabase
    .from('groups')
    .update({ cycle_status: 'closed' })
    .eq('id', groupId)

  const notifRows = payouts.map((p) => ({
    user_id: p.userId,
    group_id: groupId,
    type: 'cycle_distribution',
    message: `Cycle ${group.current_cycle_number} for ${group.name} closed. You received ${p.amount.toFixed(2)} AMBPHP.`,
  }))
  if (notifRows.length > 0) {
    await supabase.from('notifications').insert(notifRows)
  }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/admin/cycle`)
  return { ok: true, txHash, payoutCount: payouts.length }
}
