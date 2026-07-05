'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { submitContribution } from '@/app/(app)/groups/[groupId]/actions'

export function ContributeButton({
  groupId,
  amount,
}: {
  groupId: string
  amount: number
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok'; txHash: string } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onClick() {
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await submitContribution(groupId)
      if (result.ok) setStatus({ kind: 'ok', txHash: result.txHash })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={onClick}
        disabled={pending || status.kind === 'ok'}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-xl border-2 px-5 py-3.5',
          'text-sm font-bold uppercase tracking-widest',
          'transition-all duration-100',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft',
          pending || status.kind === 'ok'
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Sending…' : status.kind === 'ok' ? 'Contributed!' : `Contribute ${amount} AMBPHP`}
      </button>

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
    </div>
  )
}
