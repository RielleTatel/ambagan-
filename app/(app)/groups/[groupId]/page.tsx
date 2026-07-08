export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InviteLink } from '@/components/group/invite-link'
import { ContributeButton } from '@/components/group/contribute-button'
import { ContributionStatus } from '@/components/group/contribution-status'
import { InvestButton } from '@/components/group/invest-button'
import { OwnershipSummary } from '@/components/group/ownership-summary'

export default async function GroupOverviewPage({
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
    .select('id, name, description, stellar_account_id, invite_token, invite_active, admin_id, contribution_amount')
    .eq('id', groupId)
    .single()

  if (!group) notFound()

  let balance = '0'
  if (group.stellar_account_id) {
    try {
      balance = await getAMBPHPBalance(group.stellar_account_id)
    } catch {
      balance = '—'
    }
  }

  const { count: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  const isAdmin = group.admin_id === user.id

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{group.name}</CardTitle>
          {group.description && <CardDescription>{group.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-body-subtle">Fund balance</div>
              <div className="text-2xl font-semibold text-heading">{balance} AMBPHP</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-body-subtle">Members</div>
              <div className="text-2xl font-semibold text-heading">{memberCount ?? 0}</div>
            </div>
          </div>

          {isAdmin && group.invite_active && group.invite_token && (
            <InviteLink token={group.invite_token} />
          )}

          <ContributeButton
            groupId={group.id}
            amount={Number(group.contribution_amount)}
          />
          <ContributionStatus groupId={group.id} />
          <InvestButton groupId={group.id} />
          <OwnershipSummary groupId={group.id} userId={user.id} />
        </CardContent>
      </Card>
    </main>
  )
}
