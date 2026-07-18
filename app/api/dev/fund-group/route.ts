import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { mintAMBPHP } from '@/lib/stellar'

// DEV ONLY — fund a group's Stellar account with test AMBPHP.
// Hit: POST /api/dev/fund-group  body: { groupId, amount? }
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

  const { groupId, amount = '1000000' } = await req.json()
  if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })

  const { data: group } = await supabase
    .from('groups')
    .select('stellar_account_id')
    .eq('id', groupId)
    .single()

  if (!group?.stellar_account_id) {
    return NextResponse.json({ error: 'Group has no Stellar account' }, { status: 400 })
  }

  await mintAMBPHP(group.stellar_account_id, amount)

  return NextResponse.json({ ok: true, funded: amount, account: group.stellar_account_id })
}
