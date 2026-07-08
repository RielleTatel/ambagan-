'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { endCycleAndDistribute } from './actions'

export function EndCycleForm({
  groupId,
  totalFund,
}: {
  groupId: string
  totalFund: number
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'ok'; txHash: string; count: number }
    | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onClick() {
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await endCycleAndDistribute(groupId)
      if (result.ok)
        setStatus({
          kind: 'ok',
          txHash: result.txHash,
          count: result.payoutCount,
        })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  const done = status.kind === 'ok'

  return (
    <section className="rounded-xl border-2 border-border-danger bg-danger-soft p-6 shadow-xs">
      <h2 className="mb-2 text-lg font-bold text-heading">
        End cycle &amp; distribute
      </h2>
      <p className="mb-4 text-sm text-body">
        This transfers the full {totalFund.toFixed(2)} AMBPHP fund out of the
        group account in a single Stellar transaction. This cannot be undone.
      </p>

      <label className="mb-4 flex items-start gap-3 text-sm font-medium text-heading">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-2 border-border-default"
        />
        <span>
          I understand this will empty the group account and lock the cycle.
        </span>
      </label>

      <button
        onClick={onClick}
        disabled={!confirmed || pending || done}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-xl border-2 px-5 py-3.5',
          'text-sm font-bold uppercase tracking-widest',
          'transition-all duration-100',
          !confirmed || pending || done
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : 'border-transparent bg-danger text-white [box-shadow:0_4px_0_var(--color-danger)] active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--color-danger)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending
          ? 'Distributing…'
          : done
            ? 'Cycle closed'
            : 'End cycle & distribute'}
      </button>

      {status.kind === 'ok' && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-heading">
            Sent {status.count} payouts.
          </p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${status.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-brand hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View transaction on Stellar Expert
          </a>
        </div>
      )}

      {status.kind === 'err' && (
        <div className="mt-4 rounded-xl border-2 border-border-danger bg-neutral-primary px-4 py-3 text-sm font-medium text-danger-strong">
          {status.error}
        </div>
      )}
    </section>
  )
}
