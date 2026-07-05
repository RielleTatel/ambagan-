'use client'

import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react'

export type LedgerRow = {
  id: string
  txHash: string
  amount: number
  direction: 'in' | 'out'
  type: 'contribution' | 'disbursement' | 'repayment' | 'other'
  counterpartyName?: string
  counterpartyAccount: string
  createdAt: string
}

const TYPE_LABEL: Record<LedgerRow['type'], string> = {
  contribution: 'Contribution',
  disbursement: 'Disbursement',
  repayment: 'Repayment',
  other: 'Other',
}

const TYPE_CLS: Record<LedgerRow['type'], string> = {
  contribution: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
  disbursement: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  repayment: 'border-[#3B8FB5] bg-[#EBF5FA] text-[#3B8FB5]',
  other: 'border-border-default bg-warm-bg text-body-subtle',
}

const FILTERS: Array<{ value: 'all' | LedgerRow['type']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'contribution', label: 'Contributions' },
  { value: 'disbursement', label: 'Disbursements' },
  { value: 'repayment', label: 'Repayments' },
]

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  const [filter, setFilter] = useState<'all' | LedgerRow['type']>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={[
              'rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all',
              filter === f.value
                ? 'border-border-brand-subtle bg-surface text-fg-brand-strong [box-shadow:0_3px_0_rgba(0,0,0,0.12)]'
                : 'border-border-default bg-neutral-primary text-body-subtle hover:border-border-default-strong',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">No entries yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      r.direction === 'in'
                        ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
                        : 'border-border-warning-subtle bg-warning-soft text-fg-warning'
                    }`}
                  >
                    {r.direction === 'in' ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-heading">
                      {r.counterpartyName ??
                        `${r.counterpartyAccount.slice(0, 6)}…${r.counterpartyAccount.slice(-4)}`}
                    </p>
                    <p className="text-xs text-body-subtle">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${TYPE_CLS[r.type]}`}
                  >
                    {TYPE_LABEL[r.type]}
                  </span>
                  <span className="font-bold text-heading">
                    {r.direction === 'in' ? '+' : '−'}
                    {r.amount.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-body-subtle">AMBPHP</span>
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand-strong hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    tx
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
