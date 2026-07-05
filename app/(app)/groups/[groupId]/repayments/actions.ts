'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, sendAMBPHP } from '@/lib/stellar'
import { computeInterestShares } from '@/lib/interest-distribution'

export async function submitRepayment(input: {
  groupId: string
  loanId: string
  repaymentId: string
}): Promise<
  | { ok: true; txHash: string; loanRepaid: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: loan } = await supabase
    .from('loans')
    .select('id, borrower_id, group_id, status')
    .eq('id', input.loanId)
    .single()
  if (!loan) return { ok: false, error: 'Loan not found' }
  if (loan.borrower_id !== user.id) return { ok: false, error: 'Only the borrower can repay' }
  if (loan.group_id !== input.groupId) return { ok: false, error: 'Loan does not belong to this group' }
  if (loan.status !== 'disbursed') return { ok: false, error: `Loan status is ${loan.status}, cannot repay` }

  const { data: repayment } = await supabase
    .from('repayments')
    .select('id, loan_id, amount_due, interest, status, installment_number')
    .eq('id', input.repaymentId)
    .single()
  if (!repayment) return { ok: false, error: 'Installment not found' }
  if (repayment.loan_id !== input.loanId) return { ok: false, error: 'Installment does not belong to this loan' }
  if (repayment.status !== 'pending') return { ok: false, error: 'Installment already paid' }

  const { data: group } = await supabase
    .from('groups')
    .select('stellar_account_id')
    .eq('id', input.groupId)
    .single()
  if (!group?.stellar_account_id) return { ok: false, error: 'Group Stellar account not provisioned' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_secret_encrypted) return { ok: false, error: 'Borrower wallet not provisioned' }

  let txHash: string
  try {
    const secret = decryptSecret(profile.stellar_secret_encrypted)
    const result = await sendAMBPHP(
      secret,
      group.stellar_account_id,
      String(repayment.amount_due),
    )
    txHash = result.hash
  } catch (err) {
    return { ok: false, error: `Stellar payment failed: ${(err as Error).message}` }
  }

  const { error: updErr } = await supabase
    .from('repayments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stellar_tx_hash: txHash,
    })
    .eq('id', input.repaymentId)
    .eq('status', 'pending')
  if (updErr) return { ok: false, error: `Failed to record payment: ${updErr.message}` }

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', input.groupId)
  const nonBorrowerIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id): id is string => Boolean(id) && id !== user.id)

  const shares = computeInterestShares(Number(repayment.interest), nonBorrowerIds)
  if (shares.length > 0) {
    await supabase.from('interest_distributions').insert(
      shares.map((s) => ({
        loan_id: input.loanId,
        member_id: s.memberId,
        amount: s.amount,
      })),
    )
    for (const s of shares) {
      const { data: gm } = await supabase
        .from('group_members')
        .select('id, total_interest_earned')
        .eq('group_id', input.groupId)
        .eq('user_id', s.memberId)
        .single()
      if (gm) {
        await supabase
          .from('group_members')
          .update({
            total_interest_earned: Number(gm.total_interest_earned ?? 0) + s.amount,
          })
          .eq('id', gm.id)
      }
    }
  }

  const { count: pendingLeft } = await supabase
    .from('repayments')
    .select('id', { count: 'exact', head: true })
    .eq('loan_id', input.loanId)
    .eq('status', 'pending')

  let loanRepaid = false
  if ((pendingLeft ?? 0) === 0) {
    await supabase.from('loans').update({ status: 'repaid' }).eq('id', input.loanId)
    loanRepaid = true
  }

  revalidatePath(`/groups/${input.groupId}/repayments`)
  revalidatePath(`/groups/${input.groupId}/ledger`)
  revalidatePath(`/groups/${input.groupId}`)
  return { ok: true, txHash, loanRepaid }
}
