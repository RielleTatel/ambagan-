import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { computeLossShares } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

type Body = {
  action: 'waive' | 'partial_settle' | 'dispute'
  settledAmount?: number
}

type Ctx = { params: Promise<{ loanId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const { loanId } = await ctx.params

  const body = (await request.json().catch(() => null)) as Body | null
  if (!body) return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 })

  const validActions = ['waive', 'partial_settle', 'dispute']
  if (!validActions.includes(body.action)) {
    return Response.json({ ok: false, error: 'invalid_action' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { data: loan } = await supabase
    .from('loans')
    .select('id, group_id, amount, status, default_stage')
    .eq('id', loanId)
    .single()
  if (!loan) return Response.json({ ok: false, error: 'loan_not_found' }, { status: 404 })

  const { data: group } = await supabase
    .from('groups')
    .select('id, admin_id')
    .eq('id', loan.group_id as string)
    .single()
  if (!group) return Response.json({ ok: false, error: 'group_not_found' }, { status: 404 })
  if (group.admin_id !== user.id) {
    return Response.json({ ok: false, error: 'not_admin' }, { status: 403 })
  }

  const settled = body.action === 'partial_settle' ? Number(body.settledAmount ?? 0) : 0
  const loss = Math.max(0, Number(loan.amount) - settled)

  const { data: resolution, error: resErr } = await supabase
    .from('default_resolutions')
    .insert({
      loan_id: loanId,
      action: body.action,
      settled_amount: body.action === 'partial_settle' ? settled : null,
      loss_amount: loss,
      admin_id: user.id,
    })
    .select('id')
    .single()
  if (resErr || !resolution) {
    return Response.json({ ok: false, error: resErr?.message ?? 'insert_failed' }, { status: 500 })
  }

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, total_contributed')
    .eq('group_id', loan.group_id as string)

  const contribByMember: Record<string, number> = {}
  for (const m of members ?? []) {
    contribByMember[m.user_id as string] = Number(m.total_contributed ?? 0)
  }

  const shares = computeLossShares(loss, contribByMember)

  const distributionRows = Object.entries(shares).map(([memberId, amount]) => ({
    resolution_id: resolution.id as string,
    member_id: memberId,
    share_amount: amount,
  }))
  if (distributionRows.length > 0) {
    await supabase.from('loss_distributions').insert(distributionRows)
  }

  if (body.action !== 'dispute') {
    await supabase
      .from('loans')
      .update({ status: 'defaulted', default_stage: 4 })
      .eq('id', loanId)
  }

  return Response.json({
    ok: true,
    resolutionId: resolution.id,
    shares,
  })
}
