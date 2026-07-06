'use client'

import { useEffect, useState, useTransition } from 'react'
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { voteOnLoan } from './actions'
import { creditLetterGrade } from '@/lib/credit'

type LoanRow = {
  id: string
  amount: number
  purpose_tag: string
  description: string | null
  status: string
  borrower_id: string
  profiles?: { full_name: string; credit_score: number | null } | null
}

const PURPOSE_COLORS: Record<string, string> = {
  emergency: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
  education: 'border-[#3B8FB5] bg-[#EBF5FA] text-[#3B8FB5]',
  livelihood:'border-border-brand-subtle bg-surface text-fg-brand-strong',
  health:    'border-[#C96B8A] bg-[#FAEEF3] text-[#C96B8A]',
  other:     'border-border-default bg-warm-bg text-body-subtle',
}

const STATUS_COLORS: Record<string, string> = {
  voting:   'border-border-warning-subtle bg-warning-soft text-fg-warning',
  approved: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
  disbursed:'border-border-brand-subtle bg-surface text-fg-brand-strong',
  repaid:   'border-border-default bg-warm-bg text-body-subtle',
  defaulted:'border-border-danger-subtle bg-danger-soft text-danger-strong',
  denied:   'border-border-danger-subtle bg-danger-soft text-danger-strong',
}

export function LoanCard({
  loan,
  groupId,
  currentUserId,
  initialApproveCount,
  initialDenyCount,
  hasVoted,
}: {
  loan: LoanRow
  groupId: string
  currentUserId: string
  initialApproveCount: number
  initialDenyCount: number
  hasVoted: boolean
}) {
  const [approveCount, setApproveCount] = useState(initialApproveCount)
  const [denyCount, setDenyCount] = useState(initialDenyCount)
  const [voted, setVoted] = useState(hasVoted)
  const [loanStatus, setLoanStatus] = useState(loan.status)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`loan-votes-${loan.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `loan_id=eq.${loan.id}`,
        },
        (payload) => {
          const row = payload.new as { vote: string }
          if (row.vote === 'approve') setApproveCount((n) => n + 1)
          else if (row.vote === 'deny') setDenyCount((n) => n + 1)
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loans',
          filter: `id=eq.${loan.id}`,
        },
        (payload) => {
          const row = payload.new as { status: string }
          setLoanStatus(row.status)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loan.id])

  function cast(vote: 'approve' | 'deny') {
    setError(null)
    startTransition(async () => {
      const result = await voteOnLoan({ loanId: loan.id, groupId, vote })
      if (result.ok) setVoted(true)
      else setError(result.error)
    })
  }

  const isBorrower = loan.borrower_id === currentUserId
  const canVote = !voted && !isBorrower && loanStatus === 'voting'
  const totalVotes = approveCount + denyCount
  const approvePercent = totalVotes > 0 ? Math.round((approveCount / totalVotes) * 100) : 0

  const purposeCls = PURPOSE_COLORS[loan.purpose_tag] ?? PURPOSE_COLORS.other
  const statusCls = STATUS_COLORS[loanStatus] ?? 'border-border-default bg-warm-bg text-body-subtle'

  return (
    <li className="rounded-xl border-2 border-border-default bg-neutral-primary shadow-xs">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <p className="text-lg font-bold text-heading">
            {loan.amount} <span className="text-base font-semibold">AMBPHP</span>
          </p>
          <p className="text-xs text-body-subtle">
            by {loan.profiles?.full_name ?? loan.borrower_id}
          </p>
          {loan.profiles?.credit_score != null && (
            <span
              className={`ml-2 inline-flex items-center rounded-full border-2 px-2 py-0.5 text-[11px] font-bold ${
                creditLetterGrade(loan.profiles.credit_score) === 'A' || creditLetterGrade(loan.profiles.credit_score) === 'B'
                  ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
                  : creditLetterGrade(loan.profiles.credit_score) === 'C'
                  ? 'border-border-warning-subtle bg-warning-soft text-fg-warning'
                  : 'border-border-danger-subtle bg-danger-soft text-danger-strong'
              }`}
            >
              Credit {creditLetterGrade(loan.profiles.credit_score)}
            </span>
          )}
          {loan.description && (
            <p className="mt-2 text-sm text-body">{loan.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusCls}`}>
            {loanStatus}
          </span>
          <span className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${purposeCls}`}>
            {loan.purpose_tag}
          </span>
        </div>
      </div>

      {/* Vote tally */}
      <div className="border-t-2 border-border-default px-5 py-3">
        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-body-subtle">
          <span>Votes</span>
          <span>{totalVotes} cast</span>
        </div>

        {/* Progress bar */}
        {totalVotes > 0 && (
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-warm-bg">
            <div
              className="h-full rounded-full bg-brand transition-all duration-300"
              style={{ width: `${approvePercent}%` }}
            />
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-fg-brand-strong">
              <ThumbsUp className="h-4 w-4" />
              {approveCount}
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-danger-strong">
              <ThumbsDown className="h-4 w-4" />
              {denyCount}
            </span>
          </div>

          {canVote && (
            <div className="flex gap-2">
              <button
                onClick={() => cast('approve')}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-transparent bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-all [box-shadow:0_3px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_1px_0_var(--shadow-brand)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-disabled disabled:shadow-none"
              >
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ThumbsUp className="h-3.5 w-3.5" />}
                Approve
              </button>
              <button
                onClick={() => cast('deny')}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-danger bg-neutral-primary px-4 py-2 text-xs font-bold uppercase tracking-wide text-danger-strong transition-all [box-shadow:0_3px_0_var(--shadow-danger)] hover:bg-danger-soft active:translate-y-0.5 active:[box-shadow:0_1px_0_var(--shadow-danger)] disabled:cursor-not-allowed disabled:border-border-default disabled:text-fg-disabled disabled:shadow-none"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
                Deny
              </button>
            </div>
          )}

          {voted && loanStatus === 'voting' && (
            <span className="text-xs font-semibold text-body-subtle">Vote recorded</span>
          )}
          {isBorrower && loanStatus === 'voting' && (
            <span className="text-xs font-semibold text-body-subtle">Your request</span>
          )}
        </div>

        {error && (
          <p className="mt-2 text-xs font-medium text-danger-strong">{error}</p>
        )}
      </div>
    </li>
  )
}
