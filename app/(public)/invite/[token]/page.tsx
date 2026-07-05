import { connection } from 'next/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { JoinButton } from './join-button'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  await connection()
  const { token } = await params
  const supabase = await createClient()

  // Unauthenticated visitor → send to register with token preserved.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/register?invite=${encodeURIComponent(token)}`)

  // Look up group; RLS won't help here (visitor isn't a member yet), so
  // this select relies on invite_token being unique + non-secret enough.
  const { data: group } = await supabase
    .from('groups')
    .select('id, name, description, contribution_amount, cadence, invite_active')
    .eq('invite_token', token)
    .single()

  if (!group || !group.invite_active) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-warm-bg p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Invite unavailable</CardTitle>
            <CardDescription>
              This invite link is no longer valid. Ask the group admin for a new one.
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-warm-bg p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Join {group.name}</CardTitle>
          {group.description && <CardDescription>{group.description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded border-2 border-border-default bg-surface p-4 text-sm">
            <div>Contribution: <strong>{group.contribution_amount} AMBPHP</strong> {group.cadence}</div>
          </div>
          <JoinButton token={token} />
          <div className="text-center text-sm text-body-subtle">
            Not you?{' '}
            <Link href="/logout" className="underline">Sign out</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
