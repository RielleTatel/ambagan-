'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { resolveDefault } from './defaults-actions'

export type DefaultRowData = {
  loanId: string
  borrowerName: string
  outstandingAmount: number
  stage: 1 | 2 | 3 | 4
  daysInStage: number
}

const STAGE_CLS: Record<DefaultRowData['stage'], string> = {
  1: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  2: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  3: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
  4: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
}

export function DefaultRow({
  row,
  groupId,
}: {
  row: DefaultRowData
  groupId: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [partial, setPartial] = useState('')

  function act(action: 'waive' | 'partial_settle' | 'dispute') {
    setError(null)
    const settled = action === 'partial_settle' ? Number(partial) : undefined
    if (action === 'partial_settle' && (!settled || settled <= 0)) {
      setError('Enter a partial amount greater than 0')
      return
    }
    startTransition(async () => {
      const res = await resolveDefault({
        groupId,
        loanId: row.loanId,
        action,
        settledAmount: settled,
      })
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <li className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-heading">{row.borrowerName}</p>
          <p className="text-xs text-body-subtle">
            Outstanding {row.outstandingAmount.toFixed(2)} AMBPHP · {row.daysInStage} days in stage
          </p>
        </div>
        <span
          className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${STAGE_CLS[row.stage]}`}
        >
          Stage {row.stage}
        </span>
      </div>

      {row.stage === 3 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => act('waive')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-transparent bg-brand px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white [box-shadow:0_3px_0_var(--shadow-brand)] active:translate-y-0.5 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Waive
          </button>
          <input
            type="number"
            placeholder="Partial ₱"
            value={partial}
            onChange={(e) => setPartial(e.target.value)}
            className="w-28 rounded-lg border-2 border-border-default bg-surface px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => act('partial_settle')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-default bg-neutral-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-body [box-shadow:0_3px_0_var(--shadow-secondary)] active:translate-y-0.5 disabled:opacity-60"
          >
            Partial Settle
          </button>
          <button
            type="button"
            onClick={() => act('dispute')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-default bg-neutral-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-body [box-shadow:0_3px_0_var(--shadow-secondary)] active:translate-y-0.5 disabled:opacity-60"
          >
            Dispute
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger-strong">{error}</p>}
    </li>
  )
}
