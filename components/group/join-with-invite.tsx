'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function JoinWithInvite({ compact = false }: { compact?: boolean }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function parseToken(input: string): string | null {
    const trimmed = input.trim()
    // Full URL: extract the token after /invite/
    const urlMatch = trimmed.match(/\/invite\/([a-f0-9-]{36})/i)
    if (urlMatch) return urlMatch[1]
    // Raw UUID token
    if (/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(trimmed)) {
      return trimmed
    }
    return null
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const token = parseToken(value)
    if (!token) {
      setError('Paste a valid invite link or token.')
      return
    }
    router.push(`/invite/${token}`)
  }

  if (compact) {
    return (
      <form onSubmit={handleJoin} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste invite link…"
            className="flex-1 rounded-[12px] border-2 border-border-default bg-neutral-primary px-4 py-3 text-[15px] text-body outline-none transition-[border-color] duration-150 focus:border-border-brand placeholder:text-body-subtle"
          />
          <button
            type="submit"
            className="shrink-0 rounded-[12px] border-2 border-transparent bg-brand px-5 py-3 text-[14px] font-bold uppercase tracking-widest text-white transition-all [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
          >
            Join
          </button>
        </div>
        {error && <p className="text-[13px] font-medium text-danger-strong">{error}</p>}
      </form>
    )
  }

  return (
    <form onSubmit={handleJoin} className="flex w-full max-w-md flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste your invite link here…"
          className="flex-1 rounded-[12px] border-2 border-border-default bg-neutral-primary px-4 py-3.5 text-[15px] text-body outline-none transition-[border-color] duration-150 focus:border-border-brand placeholder:text-body-subtle"
        />
        <button
          type="submit"
          className="shrink-0 rounded-[12px] border-2 border-transparent bg-brand px-5 py-3.5 text-[14px] font-bold uppercase tracking-widest text-white transition-all [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
        >
          Join
        </button>
      </div>
      {error && <p className="text-[13px] font-medium text-danger-strong">{error}</p>}
    </form>
  )
}
