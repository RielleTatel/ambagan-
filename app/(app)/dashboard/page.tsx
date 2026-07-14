export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { GroupCard } from '@/components/group/group-card'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // group_members join → groups the user belongs to
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group:groups(id, name, description, stellar_account_id)')
    .eq('user_id', user.id)

  const groups = (memberships ?? [])
    .map((m) => (m as unknown as { group: { id: string; name: string; description: string | null; stellar_account_id: string | null } | null }).group)
    .filter((g): g is NonNullable<typeof g> => g != null)

  // Fetch balances + member counts in parallel per group.
  const enriched = await Promise.all(
    groups.map(async (g) => {
      const [balance, memberCountRes] = await Promise.all([
        g.stellar_account_id
          ? getAMBPHPBalance(g.stellar_account_id).catch(() => '—')
          : Promise.resolve('0'),
        supabase.from('group_members').select('id', { count: 'exact', head: true }).eq('group_id', g.id),
      ])
      return {
        id: g.id,
        name: g.name,
        description: g.description,
        balance,
        memberCount: memberCountRes.count ?? 0,
      }
    }),
  )

  return (
    <main className="mx-auto w-full max-w-screen-1xl p-6 md:p-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-heading">Your groups</h1>
        <Link href="/groups/new">
          <Button>Create a group</Button>
        </Link>
      </div>

      {enriched.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No groups yet</CardTitle>
            <CardDescription>
              Start a paluwagan of your own, or paste an invite link from someone to join theirs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/groups/new">
              <Button>Create your first group</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enriched.map((g) => (
            <GroupCard key={g.id} {...g} />
          ))}
        </div>
      )}
    </main>
  )
}
