export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GroupCard } from '@/components/group/group-card'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function getFirstName(fullName: string | null): string {
  if (!fullName) return 'there'
  return fullName.split(' ')[0]
}

function attentionIcon(type: string) {
  if (type?.includes('contribution')) return '⚠️'
  if (type?.includes('vote') || type?.includes('loan')) return '🗳️'
  if (type?.includes('repay')) return '💸'
  return '🔔'
}

function activityIcon(type: string) {
  if (type?.includes('contribution')) return '💰'
  if (type?.includes('loan')) return '💵'
  if (type?.includes('distribution')) return '🎉'
  if (type?.includes('repay')) return '💸'
  return '📬'
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile — for greeting
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  // Groups the user belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name, description, stellar_account_id)')
    .eq('user_id', user.id)

  const groups = (memberships ?? [])
    .map((m) => (m as unknown as { group: { id: string; name: string; description: string | null; stellar_account_id: string | null } | null }).group)
    .filter((g): g is NonNullable<typeof g> => g != null)

  const groupIds = groups.map((g) => g.id)

  // Parallel: all queries fire at once
  const [balances, allMembersRes, activeLoansRes, thisMonthRes, allContribsRes, allGroupContribsRes, notificationsRes] = await Promise.all([
    // Stellar balances — one per group, all in parallel, cached 30s each
    Promise.all(
      groups.map((g) =>
        g.stellar_account_id
          ? getAMBPHPBalance(g.stellar_account_id).catch(() => '—')
          : Promise.resolve('0'),
      ),
    ),

    // Single bulk member count query instead of one per group
    groupIds.length
      ? supabase.from('group_members').select('group_id').in('group_id', groupIds)
      : Promise.resolve({ data: [] }),

    // Active loans across all user's groups
    groupIds.length
      ? supabase
          .from('loans')
          .select('id', { count: 'exact', head: true })
          .in('group_id', groupIds)
          .in('status', ['pending', 'approved'])
      : Promise.resolve({ count: 0 }),

    // This month's contributions by the user
    supabase
      .from('contributions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),

    // All-time contributions by the user
    supabase
      .from('contributions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('status', 'confirmed'),

    // All contributions across user's groups (for ownership %)
    groupIds.length
      ? supabase
          .from('contributions')
          .select('user_id, amount')
          .in('group_id', groupIds)
          .eq('status', 'confirmed')
      : Promise.resolve({ data: [] }),

    // Notifications — attention + recent activity
    supabase
      .from('notifications')
      .select('id, type, message, group_id, read, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  // Build member count map from bulk query
  const memberCountMap = new Map<string, number>()
  for (const row of allMembersRes.data ?? []) {
    const gid = row.group_id as string
    memberCountMap.set(gid, (memberCountMap.get(gid) ?? 0) + 1)
  }

  // Combine group data with balances and member counts
  const enriched = groups.map((g, i) => ({
    id: g.id,
    name: g.name,
    description: g.description,
    balance: balances[i],
    memberCount: memberCountMap.get(g.id) ?? 0,
  }))

  // Derived stats
  const totalCommunityValue = enriched.reduce((sum, g) => {
    const n = parseFloat(g.balance)
    return sum + (isNaN(n) ? 0 : n)
  }, 0)

  const thisMonthTotal = (thisMonthRes.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
  const totalContributions = (allContribsRes.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0)

  const totalGroupContributions = (allGroupContribsRes.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
  const myOwnershipPct = totalGroupContributions > 0
    ? Math.round((totalContributions / totalGroupContributions) * 1000) / 10
    : 0

  const estimatedDistribution = myOwnershipPct > 0 && totalCommunityValue > 0
    ? (myOwnershipPct / 100) * totalCommunityValue
    : null

  const activeLoansCount = activeLoansRes.count ?? 0

  const notifications = notificationsRes.data ?? []
  const attentionItems = notifications.filter((n) => !n.read).slice(0, 5)
  const recentActivity = notifications.slice(0, 6)

  const greeting = getGreeting()
  const firstName = getFirstName(profile?.full_name ?? null)

  const fmt = (n: number) =>
    n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const stats = [
    {
      label: 'Community Value',
      value: totalCommunityValue > 0 ? `${fmt(totalCommunityValue)} AMBPHP` : '—',
    },
    {
      label: 'My Ownership',
      value: myOwnershipPct > 0 ? `${myOwnershipPct}%` : '—',
    },
    {
      label: 'Active Loans',
      value: String(activeLoansCount),
    },
    {
      label: 'This Month',
      value: thisMonthTotal > 0 ? `${fmt(thisMonthTotal)} AMBPHP` : '—',
    },
    {
      label: 'Communities',
      value: String(groups.length),
    },
    {
      label: 'Next Payout',
      value: '—',
    },
  ]

  const financials = [
    {
      label: 'Total Community Value',
      value: totalCommunityValue > 0 ? `${fmt(totalCommunityValue)} AMBPHP` : '—',
    },
    {
      label: 'Your Contributions',
      value: `${fmt(totalContributions)} AMBPHP`,
    },
    {
      label: 'Estimated Distribution',
      value: estimatedDistribution != null ? `${fmt(estimatedDistribution)} AMBPHP` : '—',
    },
    {
      label: 'Interest Earned',
      value: '—',
    },
  ]

  return (
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10 flex flex-col gap-6">

      {/* Greeting */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[28px] md:text-4xl font-bold text-heading leading-tight">
              👋 {greeting}, {firstName}
            </h1>
            <p className="mt-2 text-[17px] text-body">Welcome back to Ambagan.</p>
            <p className="mt-1 text-sm text-body-subtle">
              You have{' '}
              <span className="font-bold text-fg-brand-strong">{groups.length}</span>{' '}
              active {groups.length === 1 ? 'community' : 'communities'}.
            </p>
          </div>
          <Link href="/groups/new" className="shrink-0">
            <Button>Create Group</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-body-subtle leading-tight">
                  {stat.label}
                </p>
                <p className="text-base font-bold text-heading leading-snug break-words">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Things Requiring Your Attention */}
      {attentionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Things Requiring Your Attention</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col divide-y-2 divide-border-default">
            {attentionItems.map((n) => (
              <div key={n.id} className="flex items-center gap-3 py-3 text-[15px]">
                <span className="text-lg shrink-0">{attentionIcon(n.type as string)}</span>
                <span className="text-body">{n.message as string}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Overview</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {financials.map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <p className="text-[11px] font-bold uppercase tracking-widest text-body-subtle">
                  {item.label}
                </p>
                <p className="text-lg font-bold text-heading leading-snug break-words">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Your Communities */}
      <Card>
        <CardHeader>
          <CardTitle>Your Communities</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {enriched.length === 0 ? (
            <div className="flex flex-col gap-4">
              <CardDescription>
                Start a paluwagan of your own, or paste an invite link from someone to join theirs.
              </CardDescription>
              <Link href="/groups/new">
                <Button>Create your first group</Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enriched.map((g) => (
                <GroupCard key={g.id} {...g} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col divide-y-2 divide-border-default">
            {recentActivity.map((n) => (
              <div key={n.id} className="flex items-center gap-3 py-3">
                <span className="text-lg shrink-0">{activityIcon(n.type as string)}</span>
                <p className="flex-1 min-w-0 text-[15px] text-body truncate">
                  {n.message as string}
                </p>
                <time className="shrink-0 text-xs text-body-subtle">
                  {new Date(n.created_at as string).toLocaleDateString('en-PH', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </main>
  )
}
