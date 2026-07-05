'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { submitRepayment } from './actions'

export type RepaymentRowData = {
  id: string
  loanId: string
  installmentNumber: number
  amountDue: number
  principal: number
  interest: number
  dueDate: string
  paidAt: string | null
  stellarTxHash: string | null
  status: 'pending' | 'paid' | 'late' | 'missed'
}

const STATUS_CLS: Record<RepaymentRowData['status'], string> = {
  paid: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
  pending: 'border-border-default bg-warm-bg text-body-subtle',
  late: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  missed: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
}

export function RepaymentRow({
  row,
  groupId,
  isNextPending,
}: {
  row: RepaymentRowData
  groupId: string
  isNextPending: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onPay() {
    setError(null)
    startTransition(async () => {
      const result = await submitRepayment({
        groupId,
        loanId: row.loanId,
        repaymentId: row.id,
      })
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <li className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {row.status === 'paid' ? (
            <CheckCircle2 className="h-5 w-5 text-fg-brand-strong" />
          ) : (
            <Clock className="h-5 w-5 text-body-subtle" />
          )}
          <div>
            <p className="text-sm font-semibold text-heading">
              Month {row.installmentNumber}
            </p>
            <p className="text-xs text-body-subtle">
              Due {new Date(row.dueDate).toLocaleDateString()} · P{' '}
              {row.principal.toFixed(2)} + I {row.interest.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-heading">
            {row.amountDue.toFixed(2)}{' '}
            <span className="text-xs font-semibold text-body-subtle">AMBPHP</span>
          </span>
          <span
            className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLS[row.status]}`}
          >
            {row.status}
          </span>
          {row.status === 'paid' && row.stellarTxHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${row.stellarTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand-strong hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              tx
            </a>
          )}
          {isNextPending && (
            <button
              type="button"
              onClick={onPay}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-transparent bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-all [box-shadow:0_3px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_1px_0_var(--shadow-brand)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-disabled disabled:shadow-none"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? 'Paying…' : 'Make Payment'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-danger-strong">{error}</p>
      )}
    </li>
  )
}
