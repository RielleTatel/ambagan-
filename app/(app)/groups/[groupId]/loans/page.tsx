export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { LoanCard } from './loan-card'

export default async function LoansPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans } = await supabase
    .from('loans')
    .select('id, amount, purpose_tag, description, status, borrower_id, voting_closes_at, created_at')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  const borrowerIds = [...new Set((loans ?? []).map((l) => l.borrower_id))]
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: borrowerProfiles } = borrowerIds.length
    ? await adminClient
        .from('profiles')
        .select('id, full_name, credit_score')
        .in('id', borrowerIds)
    : { data: [] }
  const profileMap = new Map(
    (borrowerProfiles ?? []).map((p) => [p.id as string, { full_name: p.full_name as string | null, credit_score: p.credit_score as number | null }]),
  )

  const loanIds = (loans ?? []).map((l) => l.id)

  const { data: votes } = loanIds.length
    ? await supabase
        .from('votes')
        .select('loan_id, vote, voter_id')
        .in('loan_id', loanIds)
    : { data: [] }

  const tally = new Map<string, { approve: number; deny: number; mine: boolean }>()
  for (const id of loanIds) tally.set(id, { approve: 0, deny: 0, mine: false })
  for (const v of votes ?? []) {
    const t = tally.get(v.loan_id!)
    if (!t) continue
    if (v.vote === 'approve') t.approve += 1
    else t.deny += 1
    if (v.voter_id === user.id) t.mine = true
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-heading">Loans</h1>
        <Link
          href={`/groups/${groupId}/loans/request`}
          className="inline-flex items-center justify-center rounded-xl border-2 border-transparent bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-white transition-all [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
        >
          Request a loan
        </Link>
      </div>

      {(!loans || loans.length === 0) && (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">No loans yet.</p>
          <p className="mt-1 text-xs text-body-subtle">Be the first to request one.</p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {(loans ?? []).map((loan: any) => {
          const t = tally.get(loan.id) ?? { approve: 0, deny: 0, mine: false }
          const profile = profileMap.get(loan.borrower_id) ?? null
          return (
            <LoanCard
              key={loan.id}
              loan={{ ...loan, profiles: profile }}
              groupId={groupId}
              currentUserId={user.id}
              initialApproveCount={t.approve}
              initialDenyCount={t.deny}
              hasVoted={t.mine}
            />
          )
        })}
      </ul>
    </main>
  )
}
