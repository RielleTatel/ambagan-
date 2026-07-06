// Email delivery via Resend + template rendering. Owns: transactional emails
// for contribution reminders, repayment reminders, vote-opened notices, and
// default-stage escalations (spec §8).

import { Resend } from 'resend'
import { renderTemplate } from './email-templates'

export type EmailTemplate =
  | 'contribution_reminder'
  | 'repayment_reminder'
  | 'vote_opened'
  | 'loan_decision'
  | 'default_escalation'

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return { ok: false, error: 'resend_not_configured' }
  }

  const { subject, html } = renderTemplate(template, data)
  const resend = new Resend(apiKey)
  try {
    const result = await resend.emails.send({ from, to, subject, html })
    if (result.error) return { ok: false, error: result.error.message }
    return { ok: true, id: result.data?.id ?? '' }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
