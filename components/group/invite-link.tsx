'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const base = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const url = `${base}/invite/${token}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="invite-url"
        className="text-[14px] font-bold uppercase tracking-[0.6px] text-heading"
      >
        Invite link
      </label>
      <div className="flex gap-2">
        <input
          id="invite-url"
          readOnly
          value={url}
          className="flex-1 rounded-[12px] border-2 border-border-default bg-neutral-primary px-[14px] py-[12px] text-[16px] text-body outline-none focus:border-border-brand transition-[border-color] duration-150 ease-out cursor-default"
        />
        <Button
          type="button"
          onClick={copy}
          variant="tertiary"
          size="default"
        >
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
