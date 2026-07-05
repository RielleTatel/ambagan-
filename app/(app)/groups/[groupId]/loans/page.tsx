export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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
    .select('id, amount, purpose_tag, description, status, borrower_id, voting_closes_at, created_at, profiles:borrower_id(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

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
        {(loans ?? []).map((loan: any) => (
          <li
            key={loan.id}
            className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 shadow-xs"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-bold text-heading">
                  {loan.amount} AMBPHP
                </p>
                <p className="text-xs text-body-subtle">
                  by {loan.profiles?.full_name ?? loan.borrower_id}
                </p>
                {loan.description && (
                  <p className="mt-2 text-sm text-body">{loan.description}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <LoanStatusBadge status={loan.status} />
                <PurposeChip tag={loan.purpose_tag} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}

function LoanStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    voting:   'border-border-warning-subtle bg-warning-soft text-fg-warning',
    approved: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
    disbursed:'border-border-brand-subtle bg-surface text-fg-brand-strong',
    repaid:   'border-border-default bg-warm-bg text-body-subtle',
    defaulted:'border-border-danger-subtle bg-danger-soft text-danger-strong',
    denied:   'border-border-danger-subtle bg-danger-soft text-danger-strong',
  }
  const cls = map[status] ?? 'border-border-default bg-warm-bg text-body-subtle'
  return (
    <span className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  )
}

function PurposeChip({ tag }: { tag: string }) {
  const map: Record<string, string> = {
    emergency: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
    education: 'border-[#3B8FB5] bg-[#EBF5FA] text-[#3B8FB5]',
    livelihood:'border-border-brand-subtle bg-surface text-fg-brand-strong',
    health:    'border-[#C96B8A] bg-[#FAEEF3] text-[#C96B8A]',
    other:     'border-border-default bg-warm-bg text-body-subtle',
  }
  const cls = map[tag] ?? 'border-border-default bg-warm-bg text-body-subtle'
  return (
    <span className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${cls}`}>
      {tag}
    </span>
  )
}
