import { createClient } from '@/utils/supabase/server'
import { History } from 'lucide-react'

export async function CycleDistributionHistory({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('cycle_distributions')
    .select('cycle_number, payout_amount, ownership_pct, stellar_tx_hash, created_at')
    .eq('group_id', groupId)
    .eq('member_id', userId)
    .order('cycle_number', { ascending: false })

  if (!rows || rows.length === 0) return null

  return (
    <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
          <History className="h-5 w-5" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">
          Cycle payouts you&apos;ve received
        </p>
      </div>

      <ul className="mt-4 divide-y-2 divide-border-default border-t-2 border-border-default">
        {rows.map((r) => (
          <li
            key={`${r.cycle_number}-${r.stellar_tx_hash}`}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <span className="truncate text-body-subtle">
              Cycle {r.cycle_number} · {Number(r.ownership_pct).toFixed(2)}%
              ownership
            </span>
            <span className="font-semibold text-heading">
              +{Number(r.payout_amount).toFixed(2)} AMBPHP
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
