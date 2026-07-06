import type { EmailTemplate } from './email'

export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): { subject: string; html: string } {
  switch (template) {
    case 'contribution_reminder':
      return {
        subject: `Your ${data.groupName ?? 'Ambagan'} contribution is due`,
        html: layout(`
          <p>Hi ${escape(String(data.fullName ?? 'member'))},</p>
          <p>Your contribution of <strong>${escape(String(data.amount ?? ''))} AMBPHP</strong> to
          <strong>${escape(String(data.groupName ?? ''))}</strong> is due on
          ${escape(String(data.dueDate ?? ''))}.</p>
          <p><a href="${escape(String(data.groupUrl ?? '#'))}">Open your group</a> to pay now.</p>
        `),
      }
    case 'repayment_reminder':
      return {
        subject: `Loan installment due — ${data.groupName ?? 'Ambagan'}`,
        html: layout(`
          <p>Hi ${escape(String(data.fullName ?? 'member'))},</p>
          <p>Installment ${escape(String(data.installmentNumber ?? ''))} of your loan
          (${escape(String(data.amount ?? ''))} AMBPHP) is due on
          ${escape(String(data.dueDate ?? ''))}.</p>
          <p><a href="${escape(String(data.repayUrl ?? '#'))}">Make payment</a>.</p>
        `),
      }
    case 'vote_opened':
      return {
        subject: `Vote requested: loan in ${data.groupName ?? 'your group'}`,
        html: layout(`
          <p>A new loan request needs your vote.</p>
          <p><a href="${escape(String(data.loansUrl ?? '#'))}">Review the request</a>.</p>
        `),
      }
    case 'loan_decision':
      return {
        subject: `Loan ${escape(String(data.outcome ?? ''))} — ${data.groupName ?? 'Ambagan'}`,
        html: layout(`
          <p>Your loan request has been ${escape(String(data.outcome ?? ''))}.</p>
          <p><a href="${escape(String(data.loanUrl ?? '#'))}">View details</a>.</p>
        `),
      }
    case 'default_escalation':
      return {
        subject: `Loan entered stage ${escape(String(data.stage ?? ''))}`,
        html: layout(`
          <p>A loan in <strong>${escape(String(data.groupName ?? ''))}</strong> has moved to
          <strong>stage ${escape(String(data.stage ?? ''))}</strong>
          (${escape(String(data.daysPastDue ?? ''))} days past due).</p>
          <p><a href="${escape(String(data.groupUrl ?? '#'))}">Open your group</a> for details.</p>
        `),
      }
  }
}

function layout(inner: string): string {
  return `<!doctype html><html><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #1A4731; font-size: 20px; margin: 0 0 16px;">Ambagan</h1>
    ${inner}
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="font-size: 12px; color: #6b7280;">Sent by Ambagan · community savings on Stellar</p>
  </body></html>`
}

function escape(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
