'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptInvite } from './actions'

export function JoinButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const res = await acceptInvite(token)
            if (res && 'error' in res) setError(res.error)
          })
        }
      >
        {pending ? 'Joining…' : 'Join group'}
      </Button>
      {error && <p className="text-sm font-medium text-danger-strong">{error}</p>}
    </div>
  )
}
