import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stageForDaysPastDue, type DefaultStage } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

function unauthorized(res: { error: string }) {
  return Response.json({ ok: false, ...res }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return unauthorized({ error: 'unauthorized' })
  }

  const supabase = await createClient()
  const today = new Date()

  const { data: repayments } = await supabase
    .from('repayments')
    .select('id, loan_id, due_date, status')
    .eq('status', 'pending')

  const dpdByLoan = new Map<string, number>()
  const rowsToLate: string[] = []
  const rowsToMissed: string[] = []

  for (const r of repayments ?? []) {
    const due = new Date(r.due_date as string)
    const days = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (days <= 0) continue
    const stage = stageForDaysPastDue(days)
    if (stage === 1 || stage === 2) rowsToLate.push(r.id as string)
    if (stage >= 3) rowsToMissed.push(r.id as string)

    const cur = dpdByLoan.get(r.loan_id as string) ?? 0
    if (days > cur) dpdByLoan.set(r.loan_id as string, days)
  }

  if (rowsToLate.length > 0) {
    await supabase.from('repayments').update({ status: 'late' }).in('id', rowsToLate)
  }
  if (rowsToMissed.length > 0) {
    await supabase.from('repayments').update({ status: 'missed' }).in('id', rowsToMissed)
  }

  let loansEscalated = 0
  let notificationsInserted = 0

  for (const [loanId, dpd] of dpdByLoan) {
    const nextStage = stageForDaysPastDue(dpd) as DefaultStage
    if (nextStage === 0) continue

    const { data: loan } = await supabase
      .from('loans')
      .select('id, group_id, borrower_id, default_stage')
      .eq('id', loanId)
      .single()
    if (!loan) continue

    const currentStage = (loan.default_stage ?? 0) as DefaultStage
    if (nextStage <= currentStage) continue

    await supabase
      .from('loans')
      .update({
        default_stage: nextStage,
        default_stage_updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
    loansEscalated += 1

    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', loan.group_id as string)

    const rows = (members ?? []).map((m) => ({
      user_id: m.user_id as string,
      group_id: loan.group_id as string,
      type: 'default_escalation',
      message: `A loan in your group entered stage ${nextStage} (${dpd} days past due).`,
    }))
    if (rows.length > 0) {
      await supabase.from('notifications').insert(rows)
      notificationsInserted += rows.length
    }
  }

  return Response.json({
    ok: true,
    lateMarked: rowsToLate.length,
    missedMarked: rowsToMissed.length,
    loansEscalated,
    notificationsInserted,
  })
}
