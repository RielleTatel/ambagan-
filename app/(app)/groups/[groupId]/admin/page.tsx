export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { SettingsForm } from './settings-form'
import { InviteControls } from './invite-controls'
import type { GroupSettingsInput } from './actions'

export default async function AdminPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: group } = await supabase
    .from('groups')
    .select(
      'id, name, description, admin_id, contribution_amount, cadence, interest_rate, vote_threshold, invite_token, invite_active, savings_goal_name, savings_goal_amount, savings_goal_date',
    )
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

  const { data: members } = await supabase
    .from('group_members')
    .select(
      'user_id, joined_at, contribution_streak, total_contributed, profiles:user_id(full_name)',
    )
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true })

  const initial: GroupSettingsInput = {
    groupId: group.id as string,
    name: group.name as string,
    description: (group.description as string | null) ?? null,
    contributionAmount: Number(group.contribution_amount ?? 0),
    cadence: group.cadence as GroupSettingsInput['cadence'],
    interestRate: Number(group.interest_rate ?? 0),
    voteThreshold: group.vote_threshold as GroupSettingsInput['voteThreshold'],
    savingsGoalName: (group.savings_goal_name as string | null) ?? null,
    savingsGoalAmount:
      group.savings_goal_amount !== null &&
      group.savings_goal_amount !== undefined
        ? Number(group.savings_goal_amount)
        : null,
    savingsGoalDate: (group.savings_goal_date as string | null) ?? null,
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Admin — {group.name}</h1>
        <p className="text-sm text-body-subtle">
          Manage group settings, invite link, and members.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <Link
          href={`/groups/${groupId}/admin/defaults`}
          className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 text-sm font-bold text-heading transition-all duration-100 hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          Defaults →
        </Link>
        <Link
          href={`/groups/${groupId}/admin/cycle`}
          className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 text-sm font-bold text-heading transition-all duration-100 hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          End cycle →
        </Link>
        <Link
          href={`/groups/${groupId}/admin/export`}
          className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 text-sm font-bold text-heading transition-all duration-100 hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        >
          Export ledger →
        </Link>
      </div>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-2 text-lg font-bold text-heading">Settings</h2>
        <p className="mb-4 text-xs text-body-subtle">
          Financial changes (contribution amount, cadence, interest, threshold)
          apply immediately in this build. A vote-proposal flow will be added
          post-hackathon.
        </p>
        <SettingsForm initial={initial} />
      </section>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Invite link</h2>
        <InviteControls
          groupId={group.id as string}
          token={(group.invite_token as string | null) ?? null}
          initialActive={Boolean(group.invite_active)}
        />
      </section>

      <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">
          Members ({members?.length ?? 0})
        </h2>
        {!members || members.length === 0 ? (
          <p className="text-sm text-body-subtle">No members yet.</p>
        ) : (
          <ul className="divide-y-2 divide-border-default">
            {members.map((m) => {
              const raw = (m as any).profiles?.full_name
              const isUuid = typeof raw === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
              const isCurrentUser = m.user_id === user.id
              const isGroupAdmin = m.user_id === group.admin_id
              const name = raw && !isUuid ? raw : (isCurrentUser ? 'You' : 'Member')
              return (
                <li
                  key={m.user_id as string}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-heading">{name}</p>
                      {isGroupAdmin && (
                        <span className="rounded-full bg-accent-softer px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-fg-accent">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-body-subtle">
                      Joined{' '}
                      {new Date(m.joined_at as string).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-body-subtle">
                      Streak: {m.contribution_streak ?? 0}
                    </p>
                    <p className="text-sm font-semibold text-heading">
                      {Number(m.total_contributed ?? 0).toFixed(2)} AMBPHP
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}
