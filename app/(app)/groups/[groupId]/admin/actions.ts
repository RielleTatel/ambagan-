'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type GroupSettingsInput = {
  groupId: string
  name: string
  description: string | null
  contributionAmount: number
  cadence: 'weekly' | 'biweekly' | 'monthly'
  interestRate: number
  voteThreshold: 'majority' | 'two_thirds' | 'unanimous'
  savingsGoalName: string | null
  savingsGoalAmount: number | null
  savingsGoalDate: string | null
}

function validate(input: GroupSettingsInput): string | null {
  if (!input.name || input.name.length > 80)
    return 'Group name is required (max 80 chars).'
  if (input.description && input.description.length > 500)
    return 'Description too long (max 500 chars).'
  if (!(input.contributionAmount > 0) || input.contributionAmount > 1_000_000)
    return 'Contribution amount must be positive (max 1,000,000).'
  if (!['weekly', 'biweekly', 'monthly'].includes(input.cadence))
    return 'Invalid cadence.'
  if (!(input.interestRate >= 0 && input.interestRate <= 10))
    return 'Interest rate must be 0–10 percent per month.'
  if (!['majority', 'two_thirds', 'unanimous'].includes(input.voteThreshold))
    return 'Invalid vote threshold.'
  if (input.savingsGoalName && input.savingsGoalName.length > 80)
    return 'Savings goal name too long (max 80 chars).'
  if (
    input.savingsGoalAmount !== null &&
    !(input.savingsGoalAmount > 0)
  )
    return 'Savings goal amount must be positive.'
  return null
}

async function assertAdmin(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: group } = await supabase
    .from('groups')
    .select('id, admin_id')
    .eq('id', groupId)
    .single()
  if (!group) return { error: 'Group not found' as const }
  if (group.admin_id !== user.id) return { error: 'not_admin' as const }
  return { supabase, userId: user.id }
}

export async function updateGroupSettings(
  input: GroupSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = validate(input)
  if (err) return { ok: false, error: err }

  const gate = await assertAdmin(input.groupId)
  if ('error' in gate) return { ok: false, error: gate.error as string }

  const { error } = await gate.supabase
    .from('groups')
    .update({
      name: input.name,
      description: input.description,
      contribution_amount: input.contributionAmount,
      cadence: input.cadence,
      interest_rate: input.interestRate,
      vote_threshold: input.voteThreshold,
      savings_goal_name: input.savingsGoalName,
      savings_goal_amount: input.savingsGoalAmount,
      savings_goal_date: input.savingsGoalDate,
    })
    .eq('id', input.groupId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/groups/${input.groupId}`)
  revalidatePath(`/groups/${input.groupId}/admin`)
  return { ok: true }
}

export async function toggleInviteActive(
  groupId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertAdmin(groupId)
  if ('error' in gate) return { ok: false, error: gate.error as string }

  const { error } = await gate.supabase
    .from('groups')
    .update({ invite_active: active })
    .eq('id', groupId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/admin`)
  return { ok: true }
}
