import { CheckCircle2, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { computeCurrentCycle, type Cadence } from '@/lib/cycles'

export async function ContributionStatus({ groupId }: { groupId: string }) {
  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('cadence, created_at')
    .eq('id', groupId)
    .single()
  if (!group) return null

  const cycleNumber = computeCurrentCycle(
    new Date(group.created_at),
    group.cadence as Cadence,
  )

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(id, full_name)')
    .eq('group_id', groupId)

  const { data: contributions } = await supabase
    .from('contributions')
    .select('user_id, stellar_tx_hash')
    .eq('group_id', groupId)
    .eq('cycle_number', cycleNumber)
    .eq('status', 'confirmed')

  const paidByUser = new Map(
    (contributions ?? []).map((c) => [c.user_id, c.stellar_tx_hash]),
  )

  const paidCount = paidByUser.size
  const totalCount = (members ?? []).length

  return (
    <div className="rounded-xl border-2 border-border-default bg-neutral-primary shadow-xs">
      <div className="flex items-center justify-between border-b-2 border-border-default px-5 py-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-heading">
            Cycle {cycleNumber} contributions
          </h3>
          <p className="mt-0.5 text-xs text-body-subtle">
            {paidCount} of {totalCount} paid
          </p>
        </div>
        <span
          className={[
            'rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide',
            paidCount === totalCount && totalCount > 0
              ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
              : 'border-border-default bg-warm-bg text-body-subtle',
          ].join(' ')}
        >
          {paidCount === totalCount && totalCount > 0 ? 'Complete' : 'In progress'}
        </span>
      </div>

      <ul className="divide-y-2 divide-border-default">
        {(members ?? []).map((m: any) => {
          const paid = paidByUser.has(m.user_id)
          const txHash = paidByUser.get(m.user_id)
          return (
            <li key={m.user_id} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-heading">
                {m.profiles?.full_name ?? m.user_id}
              </span>
              {paid ? (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-brand-subtle bg-surface px-3 py-1 text-xs font-bold uppercase tracking-wide text-fg-brand-strong hover:underline"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Paid
                </a>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border-default bg-warm-bg px-3 py-1 text-xs font-bold uppercase tracking-wide text-body-subtle">
                  <Clock className="h-3.5 w-3.5" />
                  Pending
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
