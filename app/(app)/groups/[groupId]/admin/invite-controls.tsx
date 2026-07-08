'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { InviteLink } from '@/components/group/invite-link'
import { toggleInviteActive } from './actions'

export function InviteControls({
  groupId,
  token,
  initialActive,
}: {
  groupId: string
  token: string | null
  initialActive: boolean
}) {
  const [active, setActive] = useState(initialActive)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onToggle() {
    setError(null)
    const next = !active
    startTransition(async () => {
      const result = await toggleInviteActive(groupId, next)
      if (result.ok) setActive(next)
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {active && token && <InviteLink token={token} />}
      {!active && (
        <p className="text-sm text-body-subtle">
          Invite link is disabled. New members cannot join.
        </p>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={[
          'inline-flex items-center justify-center gap-2 self-start rounded-xl border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-100',
          pending
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : active
              ? 'border-border-danger bg-neutral-primary text-danger-strong hover:bg-danger-soft'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {active ? 'Revoke invite link' : 'Reactivate invite link'}
      </button>
      {error && (
        <p className="text-xs font-semibold text-danger-strong">{error}</p>
      )}
    </div>
  )
}
