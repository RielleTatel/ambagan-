import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAccountPayments } from '@/lib/stellar'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ groupId: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { groupId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('unauthorized', { status: 401 })
  }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return new Response('forbidden', { status: 403 })

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, stellar_account_id')
    .eq('id', groupId)
    .single()
  if (!group?.stellar_account_id) {
    return new Response('group_not_provisioned', { status: 400 })
  }

  const groupAccount = group.stellar_account_id
  const payments = await getAccountPayments(groupAccount, 200)
  const ambphp = (payments as any[]).filter(
    (p: any) =>
      p.type === 'payment' &&
      p.asset_type !== 'native' &&
      p.asset_code === 'AMBPHP',
  )
  const txHashes = ambphp.map((p: any) => p.transaction_hash)

  const [contribHits, loanHits, repayHits] = await Promise.all([
    supabase
      .from('contributions')
      .select('stellar_tx_hash, user_id, profiles:user_id(full_name)')
      .in('stellar_tx_hash', txHashes.length ? txHashes : ['__none__']),
    supabase
      .from('loans')
      .select('stellar_tx_hash, borrower_id, profiles:borrower_id(full_name)')
      .in('stellar_tx_hash', txHashes.length ? txHashes : ['__none__']),
    supabase
      .from('repayments')
      .select('stellar_tx_hash, loan_id, loans:loan_id(borrower_id, profiles:borrower_id(full_name))')
      .in('stellar_tx_hash', txHashes.length ? txHashes : ['__none__']),
  ])

  const meta = new Map<string, { type: string; counterparty?: string }>()
  for (const c of contribHits.data ?? []) {
    meta.set(c.stellar_tx_hash as string, {
      type: 'contribution',
      counterparty: (c as any).profiles?.full_name,
    })
  }
  for (const l of loanHits.data ?? []) {
    meta.set(l.stellar_tx_hash as string, {
      type: 'disbursement',
      counterparty: (l as any).profiles?.full_name,
    })
  }
  for (const r of repayHits.data ?? []) {
    meta.set(r.stellar_tx_hash as string, {
      type: 'repayment',
      counterparty: (r as any).loans?.profiles?.full_name,
    })
  }

  const header =
    'timestamp,tx_hash,direction,amount_ambphp,type,counterparty_name,counterparty_account'
  const lines = [header]
  for (const p of ambphp) {
    const info = meta.get(p.transaction_hash) ?? { type: 'other' }
    const direction = p.to === groupAccount ? 'in' : 'out'
    const counterAccount = direction === 'in' ? p.from : p.to
    lines.push(
      [
        p.created_at,
        p.transaction_hash,
        direction,
        Number(p.amount).toFixed(4),
        info.type,
        csvEscape(info.counterparty ?? ''),
        counterAccount,
      ].join(','),
    )
  }

  const body = lines.join('\n')
  const safeName = group.name.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40)
  const filename = `ambagan-${safeName}-ledger.csv`

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}
