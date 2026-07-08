'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateFullName } from './actions'

export function FullNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await updateFullName(name)
      if (result.ok) setStatus({ kind: 'ok' })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  const dirty = name.trim() !== currentName.trim()

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        Full name
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        />
        <button
          type="submit"
          disabled={pending || !dirty}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-100',
            pending || !dirty
              ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
      {status.kind === 'ok' && (
        <p className="text-xs font-semibold text-fg-brand-strong">Saved.</p>
      )}
      {status.kind === 'err' && (
        <p className="text-xs font-semibold text-danger-strong">
          {status.error}
        </p>
      )}
    </form>
  )
}
