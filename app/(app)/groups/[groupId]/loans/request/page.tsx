export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { computeMemberLoanCeiling } from '@/lib/loan-math'
import { LoanRequestForm } from './loan-request-form'

export default async function LoanRequestPage({
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
    .select('id, name, interest_rate, stellar_account_id')
    .eq('id', groupId)
    .single()
  if (!group) redirect(`/groups/${groupId}`)

  const { count: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  let balanceStr = '0'
  if (group.stellar_account_id) {
    try {
      balanceStr = await getAMBPHPBalance(group.stellar_account_id)
    } catch {
      balanceStr = '0'
    }
  }

  const ceiling = computeMemberLoanCeiling(Number(balanceStr), memberCount ?? 1)

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-heading">Request a loan</h1>
        <p className="mt-1 text-sm text-body-subtle">from {group.name}</p>
      </div>

      <div className="mb-6 rounded-xl border-2 border-border-accent bg-surface-warm px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-wide text-fg-accent">Your loan ceiling</p>
        <p className="mt-1 text-2xl font-bold text-heading">{ceiling} AMBPHP</p>
        <p className="mt-0.5 text-xs text-body-subtle">Half the current group pool balance</p>
      </div>

      <LoanRequestForm
        groupId={group.id}
        ceiling={ceiling}
        interestRate={Number(group.interest_rate)}
      />
    </main>
  )
}
