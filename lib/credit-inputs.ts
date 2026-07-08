import { createClient } from '@/utils/supabase/server'
import { computeCreditScore, type CreditInputs } from './credit'

export async function buildCreditInputs(userId: string): Promise<CreditInputs> {
  const supabase = await createClient()

  const { data: contributions } = await supabase
    .from('contributions')
    .select('status')
    .eq('user_id', userId)
    .eq('contribution_type', 'required')

  let onTimeContributions = 0
  let lateContributions = 0
  let missedContributions = 0
  for (const c of contributions ?? []) {
    if (c.status === 'confirmed') onTimeContributions += 1
    else if (c.status === 'late') lateContributions += 1
    else if (c.status === 'missed') missedContributions += 1
  }

  const { data: loans } = await supabase
    .from('loans')
    .select('id, status, default_stage')
    .eq('borrower_id', userId)

  let loansRepaidOnSchedule = 0
  let activeDefaults = 0
  for (const l of loans ?? []) {
    if (l.status === 'repaid') loansRepaidOnSchedule += 1
    if ((l.default_stage ?? 0) >= 1 && (l.default_stage ?? 0) <= 3) {
      activeDefaults += 1
    }
  }

  const { data: memberships } = await supabase
    .from('group_members')
    .select('joined_at')
    .eq('user_id', userId)

  const now = Date.now()
  const monthMs = 30 * 24 * 60 * 60 * 1000
  let monthsAsMember = 0
  for (const m of memberships ?? []) {
    const joined = new Date(m.joined_at as string).getTime()
    monthsAsMember += Math.max(0, Math.floor((now - joined) / monthMs))
  }

  return {
    onTimeContributions,
    lateContributions,
    missedContributions,
    loansRepaidOnSchedule,
    activeDefaults,
    monthsAsMember,
  }
}

export async function recomputeCreditScore(userId: string): Promise<number> {
  const supabase = await createClient()
  const inputs = await buildCreditInputs(userId)
  const score = computeCreditScore(inputs)
  await supabase
    .from('profiles')
    .update({
      credit_score: score,
      credit_score_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  return score
}
