// Email delivery via Resend + template rendering. Owns: transactional emails
// for contribution reminders, repayment reminders, vote-opened notices, and
// default-stage escalations (spec §8).

export type EmailTemplate =
  | "contribution_reminder"
  | "repayment_reminder"
  | "vote_opened"
  | "loan_decision"
  | "default_escalation";

export async function sendEmail(
  _to: string,
  _template: EmailTemplate,
  _data: Record<string, unknown>,
): Promise<void> {
  throw new Error("not_implemented");
}
