'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function resolveDefault(input: {
  groupId: string
  loanId: string
  action: 'waive' | 'partial_settle' | 'dispute'
  settledAmount?: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''

  const res = await fetch(`${proto}://${host}/api/defaults/${input.loanId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify({
      action: input.action,
      settledAmount: input.settledAmount,
    }),
  })
  const json = (await res.json().catch(() => ({}))) as
    | { ok: true }
    | { ok: false; error: string }

  if (!('ok' in json) || !json.ok) {
    return { ok: false, error: (json as any).error ?? 'request_failed' }
  }

  revalidatePath(`/groups/${input.groupId}/admin/defaults`)
  revalidatePath(`/groups/${input.groupId}`)
  return { ok: true }
}
