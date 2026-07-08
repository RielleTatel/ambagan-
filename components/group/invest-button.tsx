'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { submitInvestment } from '@/app/(app)/groups/[groupId]/actions'

export function InvestButton({ groupId }: { groupId: string }) {
  const [amount, setAmount] = useState('')
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok'; txHash: string } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus({ kind: 'err', error: 'Enter a positive amount' })
      return
    }
    startTransition(async () => {
      const result = await submitInvestment(groupId, parsed)
      if (result.ok) {
        setAmount('')
        setStatus({ kind: 'ok', txHash: result.txHash })
      } else {
        setStatus({ kind: 'err', error: result.error })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        Optional investment (AMBPHP)
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500"
          className="flex-1 rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        />
        <button
          type="submit"
          disabled={pending || !amount}
          className={[
            'inline-flex items-center justify-center gap-2',
            'rounded-xl border-2 px-5 py-3',
            'text-sm font-bold uppercase tracking-widest',
            'transition-all duration-100',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft',
            pending || !amount
              ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Sending…' : 'Invest'}
        </button>
      </div>

      {status.kind === 'ok' && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${status.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-brand hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View transaction on Stellar Expert
        </a>
      )}

      {status.kind === 'err' && (
        <div className="rounded-xl border-2 border-border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {status.error}
        </div>
      )}
    </form>
  )
}
