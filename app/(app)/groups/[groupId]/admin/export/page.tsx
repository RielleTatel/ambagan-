export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Download } from 'lucide-react'

export default async function AdminExportPage({
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
    .select('id, name, admin_id')
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Export ledger — {group.name}</h1>
        <p className="text-sm text-body-subtle">
          Download every AMBPHP movement on this group&apos;s Stellar account as a CSV file.
        </p>
      </div>

      <div className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <p className="mb-4 text-sm text-body">
          The export includes contributions, disbursements, repayments, and any other AMBPHP payment on the group account, straight from Stellar.
        </p>
        <Link
          href={`/api/groups/${groupId}/export`}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-transparent bg-brand px-5 py-3 text-sm font-bold uppercase tracking-wide text-white [box-shadow:0_4px_0_var(--shadow-brand)] active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Link>
      </div>
    </main>
  )
}
