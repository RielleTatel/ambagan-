'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Coins,
  PartyPopper,
} from 'lucide-react'
import {
  notificationDeepLink,
  notificationIconName,
} from '@/lib/notification-links'
import { markNotificationRead } from './actions'

export type NotificationRowData = {
  id: string
  type: string
  message: string
  groupId: string | null
  read: boolean
  createdAt: string
}

const ICONS = {
  Coins,
  CalendarClock,
  AlertTriangle,
  PartyPopper,
  Bell,
} as const

export function NotificationRow({ n }: { n: NotificationRowData }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const IconComp = ICONS[notificationIconName(n.type)]
  const href = notificationDeepLink(n.type, n.groupId)

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id)
      if (href) router.push(href)
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className={[
        'flex w-full items-start gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft',
        n.read
          ? 'border-border-default bg-neutral-primary'
          : 'border-border-brand-subtle bg-surface',
      ].join(' ')}
    >
      <span
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2',
          n.read
            ? 'border-border-default text-body-subtle'
            : 'border-border-brand-subtle bg-neutral-primary text-fg-brand-strong',
        ].join(' ')}
      >
        <IconComp className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <p
          className={[
            'text-sm',
            n.read ? 'font-medium text-body-subtle' : 'font-semibold text-heading',
          ].join(' ')}
        >
          {n.message}
        </p>
        <p className="mt-1 text-xs text-body-subtle">
          {new Date(n.createdAt).toLocaleString()}
        </p>
      </div>
      {!n.read && (
        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-fg-brand-strong" />
      )}
    </button>
  )
}
