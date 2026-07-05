'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { computeRepaymentSchedule } from '@/lib/loan-math'

export type PurposeTag = 'emergency' | 'education' | 'livelihood' | 'health' | 'other'

const VOTING_WINDOW_HOURS = 48

export async function requestLoan(input: {
  groupId: string
  amount: number
  purposeTag: PurposeTag
  description: string
  repaymentMonths: number
}): Promise<{ ok: true; loanId: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', input.groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member of this group' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, interest_rate')
    .eq('id', input.groupId)
    .single()
  if (!group) return { ok: false, error: 'Group not found' }

  const votingClosesAt = new Date(Date.now() + VOTING_WINDOW_HOURS * 60 * 60 * 1000)

  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .insert({
      group_id: input.groupId,
      borrower_id: user.id,
      amount: input.amount,
      interest_rate: group.interest_rate,
      purpose_tag: input.purposeTag,
      description: input.description,
      repayment_months: input.repaymentMonths,
      status: 'voting',
      voting_closes_at: votingClosesAt.toISOString(),
    })
    .select('id')
    .single()
  if (loanErr || !loan) return { ok: false, error: loanErr?.message ?? 'Failed to create loan' }

  const schedule = computeRepaymentSchedule(
    input.amount,
    input.repaymentMonths,
    Number(group.interest_rate),
  )
  const now = Date.now()
  const monthMs = 30 * 24 * 60 * 60 * 1000

  const { error: repayErr } = await supabase.from('repayments').insert(
    schedule.map((s) => ({
      loan_id: loan.id,
      installment_number: s.installmentNumber,
      amount_due: s.amountDue,
      principal: s.principal,
      interest: s.interest,
      due_date: new Date(now + s.installmentNumber * monthMs).toISOString().slice(0, 10),
      status: 'pending',
    })),
  )
  if (repayErr) return { ok: false, error: `Repayment schedule insert failed: ${repayErr.message}` }

  revalidatePath(`/groups/${input.groupId}/loans`)
  return { ok: true, loanId: loan.id }
}
