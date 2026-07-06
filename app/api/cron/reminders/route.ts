import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const supabase = await createClient()

  // Service-role client for auth.admin lookups (bypasses RLS)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const today = new Date()

  const inRange = (dueIso: string) => {
    const due = new Date(dueIso)
    const delta = daysBetween(due, today)
    return delta >= 0 && delta <= 3
  }

  let contributionRemindersSent = 0
  let repaymentRemindersSent = 0
  let remindersFailed = 0
  const notifRows: Array<{
    user_id: string
    group_id: string | null
    type: string
    message: string
  }> = []

  // ── Contribution reminders ──────────────────────────────────────────────────
  const { data: contribs } = await supabase
    .from('contributions')
    .select(
      'id, user_id, group_id, amount, due_date, status, groups(name), profiles:user_id(full_name)',
    )
    .eq('status', 'pending')

  for (const c of contribs ?? []) {
    if (!inRange(c.due_date as string)) continue

    const { data: authUser } = await adminClient.auth.admin.getUserById(
      c.user_id as string,
    )
    const email = authUser.user?.email
    if (!email) continue

    const result = await sendEmail(email, 'contribution_reminder', {
      fullName: (c as any).profiles?.full_name,
      amount: c.amount,
      groupName: (c as any).groups?.name,
      dueDate: c.due_date,
      groupUrl: `${appUrl}/groups/${c.group_id}`,
    })

    if (result.ok) {
      contributionRemindersSent += 1
      notifRows.push({
        user_id: c.user_id as string,
        group_id: c.group_id as string,
        type: 'contribution_reminder',
        message: `Your contribution of ${c.amount} AMBPHP is due ${c.due_date}.`,
      })
    } else {
      console.error(
        `[reminders] contribution email failed for user ${c.user_id}:`,
        result.error,
      )
      remindersFailed += 1
    }
  }

  // ── Repayment reminders ─────────────────────────────────────────────────────
  const { data: repays } = await supabase
    .from('repayments')
    .select(
      'id, loan_id, installment_number, amount_due, due_date, status, loans:loan_id(borrower_id, group_id, groups(name))',
    )
    .eq('status', 'pending')

  for (const r of repays ?? []) {
    if (!inRange(r.due_date as string)) continue

    const borrowerId = (r as any).loans?.borrower_id as string | undefined
    const groupId = (r as any).loans?.group_id as string | undefined
    const groupName = (r as any).loans?.groups?.name as string | undefined
    if (!borrowerId || !groupId) continue

    const { data: authUser } = await adminClient.auth.admin.getUserById(borrowerId)
    const email = authUser.user?.email
    if (!email) continue

    const result = await sendEmail(email, 'repayment_reminder', {
      fullName: authUser.user?.user_metadata?.full_name,
      installmentNumber: r.installment_number,
      amount: r.amount_due,
      groupName,
      dueDate: r.due_date,
      repayUrl: `${appUrl}/groups/${groupId}/repayments`,
    })

    if (result.ok) {
      repaymentRemindersSent += 1
      notifRows.push({
        user_id: borrowerId,
        group_id: groupId,
        type: 'repayment_reminder',
        message: `Installment ${r.installment_number} (${r.amount_due} AMBPHP) is due ${r.due_date}.`,
      })
    } else {
      console.error(
        `[reminders] repayment email failed for user ${borrowerId}:`,
        result.error,
      )
      remindersFailed += 1
    }
  }

  // ── Persist in-app notifications ────────────────────────────────────────────
  if (notifRows.length > 0) {
    await supabase.from('notifications').insert(notifRows)
  }

  return Response.json({
    ok: true,
    contributionRemindersSent,
    repaymentRemindersSent,
    remindersFailed,
  })
}
