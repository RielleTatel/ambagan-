export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { buildCreditInputs } from '@/lib/credit-inputs'
import { creditLetterGrade } from '@/lib/credit'
import { TrendingUp } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, credit_score')
    .eq('id', user.id)
    .single()

  const inputs = await buildCreditInputs(user.id)
  const score = profile?.credit_score ?? 500
  const grade = creditLetterGrade(score)

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">
          {profile?.full_name ?? 'Profile'}
        </h1>
        <p className="text-sm text-body-subtle">Your credit and activity across every Ambagan group.</p>
      </div>

      <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
            <TrendingUp className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
              Credit score
            </p>
            <p className="text-3xl font-bold text-heading">
              {score}
              <span className="ml-2 rounded-full border-2 border-border-brand-subtle bg-surface px-2 py-0.5 text-sm font-bold text-fg-brand-strong">
                {grade}
              </span>
            </p>
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="On-time contributions" value={inputs.onTimeContributions} />
          <Stat label="Late contributions" value={inputs.lateContributions} />
          <Stat label="Missed contributions" value={inputs.missedContributions} />
          <Stat label="Loans repaid on schedule" value={inputs.loansRepaidOnSchedule} />
          <Stat label="Active defaults" value={inputs.activeDefaults} />
          <Stat label="Months as member" value={inputs.monthsAsMember} />
        </ul>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li className="rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">{label}</p>
      <p className="mt-1 text-xl font-bold text-heading">{value}</p>
    </li>
  )
}
