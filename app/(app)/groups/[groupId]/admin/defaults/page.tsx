export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DefaultRow, type DefaultRowData } from './default-row'

export default async function AdminDefaultsPage({
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
    .select('id, admin_id, name')
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

  const { data: loans } = await supabase
    .from('loans')
    .select('id, borrower_id, amount, default_stage, default_stage_updated_at, profiles:borrower_id(full_name)')
    .eq('group_id', groupId)
    .gte('default_stage', 1)
    .order('default_stage', { ascending: false })

  const loanIds = (loans ?? []).map((l) => l.id as string)
  const { data: paidPrincipal } = loanIds.length
    ? await supabase
        .from('repayments')
        .select('loan_id, principal')
        .eq('status', 'paid')
        .in('loan_id', loanIds)
    : { data: [] as { loan_id: string; principal: number }[] }

  const paidByLoan = new Map<string, number>()
  for (const p of paidPrincipal ?? []) {
    const cur = paidByLoan.get(p.loan_id as string) ?? 0
    paidByLoan.set(p.loan_id as string, cur + Number(p.principal ?? 0))
  }

  const rows: DefaultRowData[] = (loans ?? []).map((l: any) => {
    const paid = paidByLoan.get(l.id) ?? 0
    const outstanding = Math.max(0, Number(l.amount) - paid)
    const updatedAt = l.default_stage_updated_at
      ? new Date(l.default_stage_updated_at).getTime()
      : Date.now()
    const daysInStage = Math.max(
      0,
      Math.floor((Date.now() - updatedAt) / (1000 * 60 * 60 * 24)),
    )
    return {
      loanId: l.id,
      borrowerName: l.profiles?.full_name ?? l.borrower_id,
      outstandingAmount: outstanding,
      stage: l.default_stage as 1 | 2 | 3 | 4,
      daysInStage,
    }
  })

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Defaults — {group.name}</h1>
        <p className="text-sm text-body-subtle">
          Loans currently in a default stage. Only stage-3 loans can be resolved here.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">No defaulted loans.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <DefaultRow key={row.loanId} row={row} groupId={groupId} />
          ))}
        </ul>
      )}
    </main>
  )
}
