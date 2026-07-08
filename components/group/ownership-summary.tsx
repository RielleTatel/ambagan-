import { createClient } from '@/utils/supabase/server'
import { computeOwnership, type MemberContribution } from '@/lib/ownership'
import { Percent } from 'lucide-react'

export async function OwnershipSummary({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const supabase = await createClient()

  const { data: contribs } = await supabase
    .from('contributions')
    .select('user_id, amount, profiles:user_id(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'confirmed')

  const byUser = new Map<
    string,
    { userId: string; totalContributed: number; name: string }
  >()
  for (const c of contribs ?? []) {
    const uid = c.user_id as string
    const name = (c as any).profiles?.full_name ?? 'Member'
    const existing = byUser.get(uid) ?? {
      userId: uid,
      totalContributed: 0,
      name,
    }
    existing.totalContributed += Number(c.amount)
    existing.name = name
    byUser.set(uid, existing)
  }

  const rows: MemberContribution[] = Array.from(byUser.values()).map((v) => ({
    userId: v.userId,
    totalContributed: v.totalContributed,
  }))
  const ownership = computeOwnership(rows)
  const nameByUser = new Map(
    Array.from(byUser.values()).map((v) => [v.userId, v.name]),
  )

  const sorted = ownership.slice().sort((a, b) => b.ownershipPct - a.ownershipPct)
  const you = ownership.find((r) => r.userId === userId)

  return (
    <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
          <Percent className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">
            Your ownership
          </p>
          <p className="text-2xl font-bold text-heading">
            {(you?.ownershipPct ?? 0).toFixed(2)}%
          </p>
          <p className="text-xs text-body-subtle">
            Based on {(you?.totalContributed ?? 0).toFixed(2)} AMBPHP contributed
          </p>
        </div>
      </div>

      {sorted.length > 0 && (
        <ul className="mt-4 divide-y-2 divide-border-default border-t-2 border-border-default">
          {sorted.slice(0, 5).map((r) => (
            <li
              key={r.userId}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="truncate text-body-subtle">
                {nameByUser.get(r.userId) ?? 'Member'}
                {r.userId === userId && (
                  <span className="ml-1 text-fg-brand-strong">(you)</span>
                )}
              </span>
              <span className="font-semibold text-heading">
                {r.ownershipPct.toFixed(2)}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
