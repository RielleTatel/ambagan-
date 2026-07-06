import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ groupId: string }> }

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return '"' + value.replace(/"/g, '""') + '"'
  return value
}

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { groupId } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()

  if (!membership) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // Fetch contributions with member profile names
  const { data: contributions, error: contribError } = await supabase
    .from('contributions')
    .select('created_at, amount, status, stellar_tx_hash, profiles:user_id(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })

  if (contribError) {
    return NextResponse.json({ error: 'failed to fetch contributions' }, { status: 500 })
  }

  // Fetch repayments with borrower profile names via loans
  const { data: repayments, error: repayError } = await supabase
    .from('repayments')
    .select(
      'created_at, amount, status, stellar_tx_hash, loan_id, loans:loan_id(borrower_id, profiles:borrower_id(full_name))',
    )
    .order('created_at', { ascending: true })
    .in(
      'loan_id',
      // sub-select loan IDs belonging to this group
      (
        await supabase.from('loans').select('id').eq('group_id', groupId)
      ).data?.map((l: { id: string }) => l.id) ?? ['__none__'],
    )

  if (repayError) {
    return NextResponse.json({ error: 'failed to fetch repayments' }, { status: 500 })
  }

  type CsvRow = {
    date: string
    type: string
    participant: string
    loan_id: string
    amount_php: number
    status: string
    tx_hash: string
    _ts: number
  }

  const rows: CsvRow[] = []

  for (const c of contributions ?? []) {
    const profile = (c as any).profiles
    const fullName: string =
      Array.isArray(profile) ? (profile[0]?.full_name ?? '') : (profile?.full_name ?? '')
    rows.push({
      date: new Date(c.created_at as string).toISOString(),
      type: 'contribution',
      participant: fullName,
      loan_id: '',
      amount_php: Number(c.amount),
      status: String(c.status ?? ''),
      tx_hash: (c.stellar_tx_hash as string | null) ?? '',
      _ts: new Date(c.created_at as string).getTime(),
    })
  }

  for (const r of repayments ?? []) {
    const loan = (r as any).loans
    const borrowerProfile = Array.isArray(loan)
      ? loan[0]?.profiles
      : loan?.profiles
    const fullName: string = Array.isArray(borrowerProfile)
      ? (borrowerProfile[0]?.full_name ?? '')
      : (borrowerProfile?.full_name ?? '')
    rows.push({
      date: new Date(r.created_at as string).toISOString(),
      type: 'repayment',
      participant: fullName,
      loan_id: String(r.loan_id ?? ''),
      amount_php: Number(r.amount),
      status: String(r.status ?? ''),
      tx_hash: (r.stellar_tx_hash as string | null) ?? '',
      _ts: new Date(r.created_at as string).getTime(),
    })
  }

  // Sort combined rows by date ascending
  rows.sort((a, b) => a._ts - b._ts)

  const header = 'date,type,participant,loan_id,amount_php,status,tx_hash'
  const lines = [header]
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.date),
        csvEscape(row.type),
        csvEscape(row.participant),
        csvEscape(row.loan_id),
        row.amount_php,
        csvEscape(row.status),
        csvEscape(row.tx_hash),
      ].join(','),
    )
  }

  const body = lines.join('\n')

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ambagan-export-${groupId}.csv"`,
    },
  })
}
