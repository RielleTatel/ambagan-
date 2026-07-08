export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { markAllNotificationsRead } from './actions'
import { NotificationRow, type NotificationRowData } from './notification-row'

async function markAllReadAction() {
  'use server'
  await markAllNotificationsRead()
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: rows } = await supabase
    .from('notifications')
    .select('id, type, message, group_id, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const items: NotificationRowData[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    type: r.type as string,
    message: r.message as string,
    groupId: (r.group_id as string | null) ?? null,
    read: Boolean(r.read),
    createdAt: r.created_at as string,
  }))

  const unread = items.filter((i) => !i.read).length

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading">Notifications</h1>
          <p className="text-sm text-body-subtle">
            {unread > 0
              ? `${unread} unread`
              : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 && (
          <form action={markAllReadAction}>
            <button
              type="submit"
              className="rounded-xl border-2 border-border-default bg-neutral-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-heading transition-all duration-100 hover:bg-warm-bg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
            >
              Mark all read
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">
            No notifications yet.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationRow n={n} />
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
