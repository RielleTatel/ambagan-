export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { computeOwnership, type MemberContribution } from '@/lib/ownership'
import { computeCyclePayouts } from '@/lib/cycle-distribution'
import { EndCycleForm } from './end-cycle-form'

export default async function AdminCyclePage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select(
      'id, name, admin_id, stellar_account_id, current_cycle_number, cycle_status',
    )
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

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
    const name = ((c as any).profiles?.full_name as string) ?? 'Member'
    const existing = byUser.get(uid) ?? {
      userId: uid,
      totalContributed: 0,
      name,
    }
    existing.totalContributed += Number(c.amount)
    existing.name = name
    byUser.set(uid, existing)
  }

  const members: MemberContribution[] = Array.from(byUser.values()).map((v) => ({
    userId: v.userId,
    totalContributed: v.totalContributed,
  }))
  const ownership = computeOwnership(members)

  let balance = '0'
  if (group.stellar_account_id) {
    try {
      balance = await getAMBPHPBalance(group.stellar_account_id)
    } catch {
      balance = '0'
    }
  }
  const totalFund = Number(balance)
  const payouts = computeCyclePayouts(totalFund, ownership)
  const payoutByUser = new Map(payouts.map((p) => [p.userId, p.amount]))

  const rows = ownership
    .slice()
    .sort((a, b) => b.ownershipPct - a.ownershipPct)
    .map((r) => ({
      userId: r.userId,
      name: byUser.get(r.userId)?.name ?? 'Member',
      totalContributed: r.totalContributed,
      ownershipPct: r.ownershipPct,
      payout: payoutByUser.get(r.userId) ?? 0,
    }))

  const closed = group.cycle_status === 'closed'

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">
          End cycle — {group.name}
        </h1>
        <p className="text-sm text-body-subtle">
          Cycle {group.current_cycle_number}. Distributes the entire fund among
          members proportional to ownership.
        </p>
      </div>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
              Distributable fund
            </p>
            <p className="text-2xl font-bold text-heading">
              {totalFund.toFixed(2)} AMBPHP
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
              Status
            </p>
            <p className="text-2xl font-bold text-heading">
              {closed ? 'Closed' : 'Active'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Payout preview</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-body-subtle">
            No contributions recorded — nothing to distribute.
          </p>
        ) : (
          <ul className="divide-y-2 divide-border-default">
            {rows.map((r) => (
              <li
                key={r.userId}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-heading">{r.name}</p>
                  <p className="text-xs text-body-subtle">
                    {r.totalContributed.toFixed(2)} AMBPHP contributed ·{' '}
                    {r.ownershipPct.toFixed(2)}% ownership
                  </p>
                </div>
                <span className="font-bold text-heading">
                  {r.payout.toFixed(2)} AMBPHP
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!closed && rows.length > 0 && totalFund > 0 && (
        <EndCycleForm groupId={groupId} totalFund={totalFund} />
      )}

      {closed && (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-5 text-sm text-body-subtle shadow-xs">
          This cycle has been closed and the fund has been distributed.
        </div>
      )}
    </main>
  )
}
