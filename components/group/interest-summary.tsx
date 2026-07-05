import { createClient } from '@/utils/supabase/server'
import { TrendingUp } from 'lucide-react'

export async function InterestSummary({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('interest_distributions')
    .select('amount, loan_id, created_at, loans:loan_id(group_id, description)')
    .eq('member_id', userId)
    .order('created_at', { ascending: false })

  const scoped = (rows ?? []).filter(
    (r: any) => r.loans?.group_id === groupId,
  )
  const total = scoped.reduce((acc: number, r: any) => acc + Number(r.amount), 0)

  return (
    <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">
            Interest earned in this group
          </p>
          <p className="text-2xl font-bold text-heading">
            {total.toFixed(2)}{' '}
            <span className="text-base font-semibold">AMBPHP</span>
          </p>
        </div>
      </div>

      {scoped.length > 0 && (
        <ul className="mt-4 divide-y-2 divide-border-default border-t-2 border-border-default">
          {scoped.slice(0, 5).map((r: any, i: number) => (
            <li
              key={`${r.loan_id}-${i}`}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="truncate text-body-subtle">
                {r.loans?.description ?? 'Loan repayment'}
              </span>
              <span className="font-semibold text-heading">
                +{Number(r.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
