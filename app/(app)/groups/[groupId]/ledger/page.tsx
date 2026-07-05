export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAccountPayments } from '@/lib/stellar'
import { LedgerTable, type LedgerRow } from './ledger-table'

export default async function GroupLedgerPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, stellar_account_id')
    .eq('id', groupId)
    .single()
  if (!group?.stellar_account_id) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6 md:p-10">
        <h1 className="text-2xl font-bold text-heading">Ledger</h1>
        <p className="mt-4 text-sm text-body-subtle">
          Group Stellar account not provisioned yet.
        </p>
      </main>
    )
  }

  const payments = await getAccountPayments(group.stellar_account_id, 50)
  const groupAccount = group.stellar_account_id

  const ambphpPayments = payments.filter(
    (p: any) =>
      p.type === 'payment' &&
      p.asset_type !== 'native' &&
      p.asset_code === 'AMBPHP',
  )
  const txHashes = ambphpPayments.map((p: any) => p.transaction_hash)

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

  const byHash = new Map<string, { type: LedgerRow['type']; counterpartyName?: string }>()
  for (const c of contribHits.data ?? []) {
    byHash.set(c.stellar_tx_hash as string, {
      type: 'contribution',
      counterpartyName: (c as any).profiles?.full_name,
    })
  }
  for (const l of loanHits.data ?? []) {
    byHash.set(l.stellar_tx_hash as string, {
      type: 'disbursement',
      counterpartyName: (l as any).profiles?.full_name,
    })
  }
  for (const r of repayHits.data ?? []) {
    byHash.set(r.stellar_tx_hash as string, {
      type: 'repayment',
      counterpartyName: (r as any).loans?.profiles?.full_name,
    })
  }

  const rows: LedgerRow[] = ambphpPayments.map((p: any) => {
    const category = byHash.get(p.transaction_hash) ?? { type: 'other' as const }
    const direction = p.to === groupAccount ? 'in' : 'out'
    return {
      id: p.id,
      txHash: p.transaction_hash,
      amount: Number(p.amount),
      direction,
      type: category.type,
      counterpartyName: category.counterpartyName,
      counterpartyAccount: direction === 'in' ? p.from : p.to,
      createdAt: p.created_at,
    }
  })

  return (
    <main className="mx-auto w-full max-w-4xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Ledger</h1>
        <p className="text-sm text-body-subtle">
          Every AMBPHP movement on the group account, straight from Stellar.
        </p>
      </div>
      <LedgerTable rows={rows} />
    </main>
  )
}
