export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { RepaymentRow, type RepaymentRowData } from './repayment-row'

export default async function RepaymentsPage({
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
    .select('id, amount, status, purpose_tag, description, disbursed_at')
    .eq('group_id', groupId)
    .eq('borrower_id', user.id)
    .in('status', ['disbursed', 'repaid'])
    .order('disbursed_at', { ascending: false })

  const loanIds = (loans ?? []).map((l) => l.id)

  const { data: repayments } = loanIds.length
    ? await supabase
        .from('repayments')
        .select('id, loan_id, installment_number, amount_due, principal, interest, due_date, paid_at, stellar_tx_hash, status')
        .in('loan_id', loanIds)
        .order('installment_number', { ascending: true })
    : { data: [] as any[] }

  const byLoan = new Map<string, any[]>()
  for (const r of repayments ?? []) {
    const arr = byLoan.get(r.loan_id!) ?? []
    arr.push(r)
    byLoan.set(r.loan_id!, arr)
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Repayments</h1>
        <p className="text-sm text-body-subtle">
          Your installments across every loan you&apos;ve taken from this group.
        </p>
      </div>

      {(!loans || loans.length === 0) && (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">No active loans.</p>
        </div>
      )}

      <ul className="flex flex-col gap-6">
        {(loans ?? []).map((loan) => {
          const installments = byLoan.get(loan.id) ?? []
          const paidCount = installments.filter((i: any) => i.status === 'paid').length
          const nextPendingId = installments.find((i: any) => i.status === 'pending')?.id
          const progressPct =
            installments.length > 0
              ? Math.round((paidCount / installments.length) * 100)
              : 0

          return (
            <li
              key={loan.id}
              className="rounded-xl border-2 border-border-default bg-neutral-primary shadow-xs"
            >
              <div className="border-b-2 border-border-default px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-heading">
                      {loan.amount}{' '}
                      <span className="text-base font-semibold">AMBPHP</span>
                    </p>
                    {loan.description && (
                      <p className="mt-1 text-sm text-body">{loan.description}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      loan.status === 'repaid'
                        ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
                        : 'border-border-warning-subtle bg-warning-soft text-fg-warning'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-body-subtle">
                    <span>
                      {paidCount} of {installments.length} paid
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-warm-bg">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <ul className="divide-y-2 divide-border-default">
                {installments.map((inst: any) => {
                  const data: RepaymentRowData = {
                    id: inst.id,
                    loanId: loan.id,
                    installmentNumber: inst.installment_number,
                    amountDue: Number(inst.amount_due),
                    principal: Number(inst.principal),
                    interest: Number(inst.interest),
                    dueDate: inst.due_date,
                    paidAt: inst.paid_at,
                    stellarTxHash: inst.stellar_tx_hash,
                    status: inst.status,
                  }
                  return (
                    <RepaymentRow
                      key={inst.id}
                      row={data}
                      groupId={groupId}
                      isNextPending={inst.id === nextPendingId && loan.status === 'disbursed'}
                    />
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
