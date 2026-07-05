'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  generateKeypair,
  encryptSecret,
  fundTestnetAccount,
  establishTrustline,
  setupGroupMultisig,
} from '@/lib/stellar'

export type Cadence = 'weekly' | 'biweekly' | 'monthly'
export type VoteThreshold = 'majority' | 'two_thirds' | 'unanimous'

export type CreateGroupInput = {
  name: string
  description?: string
  contributionAmount: number
  cadence: Cadence
  interestRate: number
  voteThreshold: VoteThreshold
  savingsGoalName?: string
  savingsGoalAmount?: number
  savingsGoalDate?: string
}

export type CreateGroupResult = { error: string } | { groupId: string }

function validate(input: CreateGroupInput): string | null {
  if (!input.name || input.name.length > 80) return 'Group name is required (max 80 chars).'
  if (input.description && input.description.length > 500) return 'Description too long (max 500 chars).'
  if (!(input.contributionAmount > 0) || input.contributionAmount > 1_000_000)
    return 'Contribution amount must be a positive number (max 1,000,000).'
  if (!['weekly', 'biweekly', 'monthly'].includes(input.cadence)) return 'Invalid cadence.'
  if (!(input.interestRate >= 0 && input.interestRate <= 10))
    return 'Interest rate must be between 0 and 10 percent per month.'
  if (!['majority', 'two_thirds', 'unanimous'].includes(input.voteThreshold))
    return 'Invalid vote threshold.'
  if (input.savingsGoalName && input.savingsGoalName.length > 80)
    return 'Savings goal name too long (max 80 chars).'
  if (input.savingsGoalAmount !== undefined && !(input.savingsGoalAmount > 0))
    return 'Savings goal amount must be positive.'
  if (input.savingsGoalDate) {
    const d = new Date(input.savingsGoalDate)
    if (Number.isNaN(d.valueOf()) || d.getTime() < Date.now())
      return 'Savings goal date must be in the future.'
  }
  return null
}

export async function createGroup(input: CreateGroupInput): Promise<CreateGroupResult> {
  const err = validate(input)
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()

  if (!profile?.stellar_public_key) redirect('/onboarding/wallet')

  // 1. Insert groups row first — we can roll it back if Stellar setup fails.
  const { data: group, error: insertErr } = await supabase
    .from('groups')
    .insert({
      name: input.name,
      description: input.description ?? null,
      contribution_amount: input.contributionAmount,
      cadence: input.cadence,
      interest_rate: input.interestRate,
      vote_threshold: input.voteThreshold,
      admin_id: user.id,
      savings_goal_name: input.savingsGoalName ?? null,
      savings_goal_amount: input.savingsGoalAmount ?? null,
      savings_goal_date: input.savingsGoalDate ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !group) return { error: insertErr?.message ?? 'Failed to create group.' }

  try {
    // 2. Provision the group's Stellar account.
    const { publicKey, secretKey } = generateKeypair()
    await fundTestnetAccount(publicKey)
    await establishTrustline(secretKey)
    await setupGroupMultisig(secretKey, [profile.stellar_public_key], 1)

    // 3. Persist Stellar identity + encrypted secret on the group.
    const { error: updateErr } = await supabase
      .from('groups')
      .update({
        stellar_account_id: publicKey,
        stellar_secret_encrypted: encryptSecret(secretKey),
      })
      .eq('id', group.id)
    if (updateErr) throw updateErr

    // 4. Insert admin as first member.
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })
    if (memberErr) throw memberErr
  } catch (e) {
    // Roll back the DB row so the user can retry cleanly.
    await supabase.from('groups').delete().eq('id', group.id)
    const message = e instanceof Error ? e.message : 'Stellar setup failed.'
    return { error: `Failed to provision group: ${message}` }
  }

  redirect(`/groups/${group.id}`)
}
