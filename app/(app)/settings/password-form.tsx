'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    if (password.length < 6) {
      setStatus({ kind: 'err', error: 'Password must be at least 6 characters' })
      return
    }
    if (password !== confirm) {
      setStatus({ kind: 'err', error: 'Passwords do not match' })
      return
    }
    setPending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setStatus({ kind: 'err', error: error.message })
        return
      }
      setPassword('')
      setConfirm('')
      setStatus({ kind: 'ok' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        New password
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        className="rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
      />
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        Confirm new password
      </label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        className="rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
      />
      <button
        type="submit"
        disabled={pending || !password || !confirm}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-100',
          pending || !password || !confirm
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
      {status.kind === 'ok' && (
        <p className="text-xs font-semibold text-fg-brand-strong">
          Password updated.
        </p>
      )}
      {status.kind === 'err' && (
        <p className="text-xs font-semibold text-danger-strong">
          {status.error}
        </p>
      )}
    </form>
  )
}
