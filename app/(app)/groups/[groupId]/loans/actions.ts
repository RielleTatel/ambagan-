'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { computeRepaymentSchedule } from '@/lib/loan-math'
import { computeThreshold, type VoteThreshold } from '@/lib/group-threshold'
import { decryptSecret, disburseLoan } from '@/lib/stellar'

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

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Idempotency guard — skip if repayments already exist for this loan
  const { count: existingCount } = await adminClient
    .from('repayments')
    .select('id', { count: 'exact', head: true })
    .eq('loan_id', loan.id)
  if ((existingCount ?? 0) > 0) {
    revalidatePath(`/groups/${input.groupId}/loans`)
    return { ok: true, loanId: loan.id }
  }

  const { error: repayErr } = await adminClient.from('repayments').insert(
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

export async function voteOnLoan(input: {
  loanId: string
  groupId: string
  vote: 'approve' | 'deny'
}): Promise<{ ok: true; approved: boolean } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', input.groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member' }

  const { error: voteErr } = await supabase.from('votes').insert({
    loan_id: input.loanId,
    voter_id: user.id,
    vote: input.vote,
  })
  // 23505 = unique_violation: vote already recorded (network retry) — safe to continue
  if (voteErr && voteErr.code !== '23505') {
    return { ok: false, error: `Vote insert failed: ${voteErr.message}` }
  }

  const { data: group } = await supabase
    .from('groups')
    .select('vote_threshold')
    .eq('id', input.groupId)
    .single()
  if (!group) return { ok: false, error: 'Group not found' }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { count: memberCount } = await adminClient
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', input.groupId)

  const { count: approveCount } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('loan_id', input.loanId)
    .eq('vote', 'approve')

  const threshold = computeThreshold(
    group.vote_threshold as VoteThreshold,
    memberCount ?? 1,
  )
  const approved = (approveCount ?? 0) >= threshold

  if (approved) {
    const { data: loan } = await supabase
      .from('loans')
      .select('amount, borrower_id, status')
      .eq('id', input.loanId)
      .single()
    if (!loan) return { ok: false, error: 'Loan disappeared during disbursement' }
    if (loan.status !== 'voting') {
      revalidatePath(`/groups/${input.groupId}/loans`)
      return { ok: true, approved: true }
    }

    const { data: fullGroup } = await supabase
      .from('groups')
      .select('stellar_account_id, stellar_secret_encrypted')
      .eq('id', input.groupId)
      .single()
    if (!fullGroup?.stellar_secret_encrypted || !fullGroup.stellar_account_id) {
      return { ok: false, error: 'Group Stellar account not provisioned' }
    }

    const { data: borrowerProfile } = await adminClient
      .from('profiles')
      .select('stellar_public_key')
      .eq('id', loan.borrower_id)
      .single()
    if (!borrowerProfile?.stellar_public_key) {
      return { ok: false, error: 'Borrower has no Stellar account' }
    }

    const extraNeeded = Math.max(0, threshold - 1)
    const { data: approvers } = await adminClient
      .from('votes')
      .select('voter_id, profiles:voter_id(stellar_secret_encrypted)')
      .eq('loan_id', input.loanId)
      .eq('vote', 'approve')
      .limit(extraNeeded)

    const extraSecrets = (approvers ?? [])
      .map((a: any) => a.profiles?.stellar_secret_encrypted)
      .filter((s: string | null | undefined): s is string => Boolean(s))
      .map(decryptSecret)

    if (extraSecrets.length < extraNeeded) {
      return { ok: false, error: 'Not enough signer secrets available for disbursement' }
    }

    let disbursementHash: string
    try {
      const groupSecret = decryptSecret(fullGroup.stellar_secret_encrypted)
      const result = await disburseLoan(
        groupSecret,
        borrowerProfile.stellar_public_key,
        String(loan.amount),
        extraSecrets,
      )
      disbursementHash = result.hash
    } catch (err) {
      return { ok: false, error: `Disbursement failed: ${(err as Error).message}` }
    }

    const { error: updateErr } = await adminClient
      .from('loans')
      .update({
        status: 'disbursed',
        approved_at: new Date().toISOString(),
        disbursed_at: new Date().toISOString(),
        stellar_tx_hash: disbursementHash,
      })
      .eq('id', input.loanId)
    if (updateErr) return { ok: false, error: `Failed to update loan status: ${updateErr.message}` }
  }

  revalidatePath(`/groups/${input.groupId}/loans`)
  return { ok: true, approved }
}
