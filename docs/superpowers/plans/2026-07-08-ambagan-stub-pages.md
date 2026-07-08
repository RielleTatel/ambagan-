# Ambagan Stub Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the three remaining empty-stub pages — `/notifications`, `/settings`, and `/groups/[groupId]/admin` — into working screens that read/write the data already in Supabase.

**Architecture:** RSC-first. Each page is a server component that pulls from Supabase directly. Interactive bits (mark-as-read, update-name, save-group-settings) live in small client components that call server actions colocated in the route folder. No new tables, no new columns — every write target already exists.

**Tech Stack:** Next.js App Router (RSC + server actions), Supabase JS SDK, Vitest for the one pure helper.

## Global Constraints

- Test framework: `vitest`; tests colocated with source (e.g. `lib/foo.ts` + `lib/foo.test.ts`). Run with `npm test`.
- Server actions: file starts with `'use server'`; use `createClient()` from `@/utils/supabase/server`; return `{ ok: true, ... } | { ok: false, error: string }` on user-facing actions.
- Client components declare `'use client'` at the top.
- Design system: 2px borders (`border-2 border-border-default`), 12px radius (`rounded-xl`), tactile buttons (`[box-shadow:0_4px_0_var(--shadow-brand)]`), forest green primary, mint on cream background. Neutral surfaces use `bg-neutral-primary`. Danger surfaces use `bg-danger-soft border-border-danger`. Do not introduce new colors.
- Auth: password/email updates go through `supabase.auth.updateUser()` (client-side, session-scoped). Profile fields (`full_name`) live in the `profiles` table.
- Deferred (out of this plan, mentioned once so it isn't relitigated per task): email notification preferences per event type; Freighter wallet toggle; majority-vote proposal flow for financial-parameter edits (contribution_amount, cadence, interest_rate, vote_threshold). This plan ships immediate edits for all admin fields with a UI note explaining the deferral.
- Notification types already in use (must all be handled by the mapper): `contribution_reminder`, `repayment_reminder`, `default_escalation`, `cycle_distribution`.

---

## File Structure

### Notifications

**Create:**
- `lib/notification-links.ts` — pure mapper: `notificationDeepLink(type, groupId) → string | null` and `notificationIconName(type) → string` (returns a Lucide icon name)
- `lib/notification-links.test.ts` — Vitest suite
- `app/(app)/notifications/actions.ts` — `markNotificationRead()`, `markAllNotificationsRead()`
- `app/(app)/notifications/notification-row.tsx` — client row: link + mark-read on click

**Modify:**
- `app/(app)/notifications/page.tsx` — replace stub with an RSC that lists notifications

### Settings

**Create:**
- `app/(app)/settings/actions.ts` — `updateFullName(newName)`
- `app/(app)/settings/full-name-form.tsx` — client form
- `app/(app)/settings/password-form.tsx` — client form; uses `supabase.auth.updateUser({ password })` via the browser client

**Modify:**
- `app/(app)/settings/page.tsx` — replace stub with RSC composing the sections

### Admin (index)

**Create:**
- `app/(app)/groups/[groupId]/admin/actions.ts` — `updateGroupSettings()`, `toggleInviteActive()`
- `app/(app)/groups/[groupId]/admin/settings-form.tsx` — client form for all group fields
- `app/(app)/groups/[groupId]/admin/invite-controls.tsx` — client toggle + revoke/reactivate + link display

**Modify:**
- `app/(app)/groups/[groupId]/admin/page.tsx` — replace stub with full admin RSC

---

## Task 1: Notification link + icon mapper

**Files:**
- Create: `lib/notification-links.ts`
- Create: `lib/notification-links.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type NotificationType = 'contribution_reminder' | 'repayment_reminder' | 'default_escalation' | 'cycle_distribution'`
  - `notificationDeepLink(type: string, groupId: string | null): string | null` — returns the route to open when the notification is clicked, or `null` when there's no meaningful destination (unknown type + null groupId)
  - `notificationIconName(type: string): 'Coins' | 'CalendarClock' | 'AlertTriangle' | 'PartyPopper' | 'Bell'` — a Lucide icon name; falls back to `'Bell'` for unknown types

- [ ] **Step 1: Write the failing test**

Create `lib/notification-links.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import {
  notificationDeepLink,
  notificationIconName,
} from './notification-links'

describe('notificationDeepLink', () => {
  it('sends contribution_reminder to the group overview', () => {
    expect(notificationDeepLink('contribution_reminder', 'g1')).toBe(
      '/groups/g1',
    )
  })

  it('sends repayment_reminder to the repayments page', () => {
    expect(notificationDeepLink('repayment_reminder', 'g1')).toBe(
      '/groups/g1/repayments',
    )
  })

  it('sends default_escalation to the loans page', () => {
    expect(notificationDeepLink('default_escalation', 'g1')).toBe(
      '/groups/g1/loans',
    )
  })

  it('sends cycle_distribution to the group overview', () => {
    expect(notificationDeepLink('cycle_distribution', 'g1')).toBe('/groups/g1')
  })

  it('falls back to the group overview for unknown types', () => {
    expect(notificationDeepLink('mystery_type', 'g1')).toBe('/groups/g1')
  })

  it('returns null when groupId is missing', () => {
    expect(notificationDeepLink('contribution_reminder', null)).toBeNull()
  })
})

describe('notificationIconName', () => {
  it('maps known types to their icons', () => {
    expect(notificationIconName('contribution_reminder')).toBe('Coins')
    expect(notificationIconName('repayment_reminder')).toBe('CalendarClock')
    expect(notificationIconName('default_escalation')).toBe('AlertTriangle')
    expect(notificationIconName('cycle_distribution')).toBe('PartyPopper')
  })

  it('falls back to Bell for unknown types', () => {
    expect(notificationIconName('anything_else')).toBe('Bell')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/notification-links.test.ts
```

Expected: FAIL with "Cannot find module './notification-links'".

- [ ] **Step 3: Implement the mapper**

Create `lib/notification-links.ts`:

```ts
export type NotificationType =
  | 'contribution_reminder'
  | 'repayment_reminder'
  | 'default_escalation'
  | 'cycle_distribution'

export type NotificationIconName =
  | 'Coins'
  | 'CalendarClock'
  | 'AlertTriangle'
  | 'PartyPopper'
  | 'Bell'

export function notificationDeepLink(
  type: string,
  groupId: string | null,
): string | null {
  if (!groupId) return null
  switch (type) {
    case 'repayment_reminder':
      return `/groups/${groupId}/repayments`
    case 'default_escalation':
      return `/groups/${groupId}/loans`
    case 'contribution_reminder':
    case 'cycle_distribution':
    default:
      return `/groups/${groupId}`
  }
}

export function notificationIconName(type: string): NotificationIconName {
  switch (type) {
    case 'contribution_reminder':
      return 'Coins'
    case 'repayment_reminder':
      return 'CalendarClock'
    case 'default_escalation':
      return 'AlertTriangle'
    case 'cycle_distribution':
      return 'PartyPopper'
    default:
      return 'Bell'
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- lib/notification-links.test.ts
```

Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/notification-links.ts lib/notification-links.test.ts
git commit -m "feat(notifications): pure mapper for icons and deep links"
```

---

## Task 2: Mark-as-read server actions

**Files:**
- Create: `app/(app)/notifications/actions.ts`

**Interfaces:**
- Consumes: `createClient` from `@/utils/supabase/server`
- Produces:
  - `markNotificationRead(id: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `markAllNotificationsRead(): Promise<{ ok: true; updated: number } | { ok: false; error: string }>`
  - Both revalidate `/notifications` on success.

- [ ] **Step 1: Create the actions file**

Create `app/(app)/notifications/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function markNotificationRead(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/notifications')
  return { ok: true }
}

export async function markAllNotificationsRead(): Promise<
  { ok: true; updated: number } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', user.id)
    .eq('read', false)
    .select('id')
  if (error) return { ok: false, error: error.message }

  revalidatePath('/notifications')
  return { ok: true, updated: data?.length ?? 0 }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/notifications/actions.ts
git commit -m "feat(notifications): server actions to mark read"
```

---

## Task 3: Notifications page + row component

**Files:**
- Create: `app/(app)/notifications/notification-row.tsx`
- Modify: `app/(app)/notifications/page.tsx`

**Interfaces:**
- Consumes: `notificationDeepLink`, `notificationIconName` from `@/lib/notification-links`; `markNotificationRead`, `markAllNotificationsRead` from `./actions`
- Produces: A working `/notifications` page

- [ ] **Step 1: Create the client row component**

Create `app/(app)/notifications/notification-row.tsx`:

```tsx
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
```

- [ ] **Step 2: Rewrite the notifications page**

Replace `app/(app)/notifications/page.tsx` with:

```tsx
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
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds; no TypeScript errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

- Trigger at least one notification (either wait for a cron sweep or insert a test row via Supabase SQL editor: `insert into notifications (user_id, group_id, type, message) values ('<your-user-id>', '<a group>', 'contribution_reminder', 'Test');`).
- Open `/notifications`. Expect the row to render as unread (brand-colored border, filled dot on the right).
- Click it. Expect the mark-read call to fire and the router to push to the mapped destination.
- Reload `/notifications`. Expect the row to render as read (neutral, no dot).
- Insert another unread row, open `/notifications`, click "Mark all read". Expect the row to render as read.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(notifications): list, mark-read, deep-link on click"
```

---

## Task 4: Update-full-name action + form

**Files:**
- Create: `app/(app)/settings/actions.ts`
- Create: `app/(app)/settings/full-name-form.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/utils/supabase/server`
- Produces:
  - `updateFullName(newName: string): Promise<{ ok: true } | { ok: false; error: string }>`
  - `<FullNameForm currentName: string />` client form

- [ ] **Step 1: Create the action**

Create `app/(app)/settings/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function updateFullName(
  newName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const trimmed = newName.trim()
  if (trimmed.length < 1 || trimmed.length > 80) {
    return { ok: false, error: 'Name must be 1–80 characters' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: trimmed })
    .eq('id', user.id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/settings')
  revalidatePath('/profile')
  return { ok: true }
}
```

- [ ] **Step 2: Create the form**

Create `app/(app)/settings/full-name-form.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { updateFullName } from './actions'

export function FullNameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await updateFullName(name)
      if (result.ok) setStatus({ kind: 'ok' })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  const dirty = name.trim() !== currentName.trim()

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        Full name
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        />
        <button
          type="submit"
          disabled={pending || !dirty}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-100',
            pending || !dirty
              ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save
        </button>
      </div>
      {status.kind === 'ok' && (
        <p className="text-xs font-semibold text-fg-brand-strong">Saved.</p>
      )}
      {status.kind === 'err' && (
        <p className="text-xs font-semibold text-danger-strong">
          {status.error}
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(settings): update full name action + form"
```

---

## Task 5: Update-password client form

**Files:**
- Create: `app/(app)/settings/password-form.tsx`

**Interfaces:**
- Consumes: `createClient` from `@/utils/supabase/client`
- Produces: `<PasswordForm />` client component

- [ ] **Step 1: Create the form**

Create `app/(app)/settings/password-form.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

export function PasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    if (password.length < 6) {
      setStatus({ kind: 'err', error: 'Password must be at least 6 characters' })
      return
    }
    if (password !== confirm) {
      setStatus({ kind: 'err', error: 'Passwords do not match' })
      return
    }
    setPending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setStatus({ kind: 'err', error: error.message })
        return
      }
      setPassword('')
      setConfirm('')
      setStatus({ kind: 'ok' })
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        New password
      </label>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        className="rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
      />
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        Confirm new password
      </label>
      <input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        className="rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
      />
      <button
        type="submit"
        disabled={pending || !password || !confirm}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-100',
          pending || !password || !confirm
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Update password
      </button>
      {status.kind === 'ok' && (
        <p className="text-xs font-semibold text-fg-brand-strong">
          Password updated.
        </p>
      )}
      {status.kind === 'err' && (
        <p className="text-xs font-semibold text-danger-strong">
          {status.error}
        </p>
      )}
    </form>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(settings): change-password form"
```

---

## Task 6: Compose the settings page

**Files:**
- Modify: `app/(app)/settings/page.tsx`

**Interfaces:**
- Consumes: `FullNameForm` and `PasswordForm` from Tasks 4 and 5
- Produces: A working `/settings` page

- [ ] **Step 1: Rewrite the settings page**

Replace `app/(app)/settings/page.tsx` with:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { FullNameForm } from './full-name-form'
import { PasswordForm } from './password-form'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, stellar_public_key, is_custodial')
    .eq('id', user.id)
    .single()

  const fullName = profile?.full_name ?? ''
  const isCustodial = profile?.is_custodial ?? true

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Settings</h1>
        <p className="text-sm text-body-subtle">
          Manage your account.
        </p>
      </div>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Account</h2>
        <FullNameForm currentName={fullName} />
        <div className="mt-6">
          <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
            Email
          </p>
          <p className="mt-1 text-sm font-medium text-heading">{user.email}</p>
          <p className="mt-1 text-xs text-body-subtle">
            Email changes are not supported yet. Contact support.
          </p>
        </div>
      </section>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Password</h2>
        <PasswordForm />
      </section>

      <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Wallet</h2>
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
            Mode
          </p>
          <p className="mt-1 text-sm font-medium text-heading">
            {isCustodial ? 'Custodial (managed by Ambagan)' : 'Freighter'}
          </p>
        </div>
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
            Stellar public key
          </p>
          <p className="mt-1 break-all font-mono text-xs text-body">
            {profile?.stellar_public_key ?? '—'}
          </p>
        </div>
        <p className="mt-4 text-xs text-body-subtle">
          Switching to Freighter is not enabled in this build.
        </p>
      </section>
    </main>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Manual smoke test**

```bash
npm run dev
```

- Open `/settings`. Verify the account, password, and wallet sections render.
- Change your name and click Save. Expect "Saved." to appear. Reload — the field should keep the new value. Check `/profile` — the heading should also update.
- Set a new password twice (matching), click Update password. Expect "Password updated." Log out and log back in with the new password.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(settings): compose page — account, password, wallet"
```

---

## Task 7: Admin server actions — settings + invite toggle

**Files:**
- Create: `app/(app)/groups/[groupId]/admin/actions.ts`

**Interfaces:**
- Consumes: `createClient` from `@/utils/supabase/server`
- Produces:
  - `updateGroupSettings(input: GroupSettingsInput): Promise<{ ok: true } | { ok: false; error: string }>` where `GroupSettingsInput` is:
    ```ts
    type GroupSettingsInput = {
      groupId: string
      name: string
      description: string | null
      contributionAmount: number
      cadence: 'weekly' | 'biweekly' | 'monthly'
      interestRate: number
      voteThreshold: 'majority' | 'two_thirds' | 'unanimous'
      savingsGoalName: string | null
      savingsGoalAmount: number | null
      savingsGoalDate: string | null
    }
    ```
  - `toggleInviteActive(groupId: string, active: boolean): Promise<{ ok: true } | { ok: false; error: string }>`
  - Both re-check that the caller is `group.admin_id` and return `not_admin` otherwise. Both revalidate the admin page and the group overview.

- [ ] **Step 1: Create the actions**

Create `app/(app)/groups/[groupId]/admin/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export type GroupSettingsInput = {
  groupId: string
  name: string
  description: string | null
  contributionAmount: number
  cadence: 'weekly' | 'biweekly' | 'monthly'
  interestRate: number
  voteThreshold: 'majority' | 'two_thirds' | 'unanimous'
  savingsGoalName: string | null
  savingsGoalAmount: number | null
  savingsGoalDate: string | null
}

function validate(input: GroupSettingsInput): string | null {
  if (!input.name || input.name.length > 80)
    return 'Group name is required (max 80 chars).'
  if (input.description && input.description.length > 500)
    return 'Description too long (max 500 chars).'
  if (!(input.contributionAmount > 0) || input.contributionAmount > 1_000_000)
    return 'Contribution amount must be positive (max 1,000,000).'
  if (!['weekly', 'biweekly', 'monthly'].includes(input.cadence))
    return 'Invalid cadence.'
  if (!(input.interestRate >= 0 && input.interestRate <= 10))
    return 'Interest rate must be 0–10 percent per month.'
  if (!['majority', 'two_thirds', 'unanimous'].includes(input.voteThreshold))
    return 'Invalid vote threshold.'
  if (input.savingsGoalName && input.savingsGoalName.length > 80)
    return 'Savings goal name too long (max 80 chars).'
  if (
    input.savingsGoalAmount !== null &&
    !(input.savingsGoalAmount > 0)
  )
    return 'Savings goal amount must be positive.'
  return null
}

async function assertAdmin(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: group } = await supabase
    .from('groups')
    .select('id, admin_id')
    .eq('id', groupId)
    .single()
  if (!group) return { error: 'Group not found' as const }
  if (group.admin_id !== user.id) return { error: 'not_admin' as const }
  return { supabase, userId: user.id }
}

export async function updateGroupSettings(
  input: GroupSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const err = validate(input)
  if (err) return { ok: false, error: err }

  const gate = await assertAdmin(input.groupId)
  if ('error' in gate) return { ok: false, error: gate.error }

  const { error } = await gate.supabase
    .from('groups')
    .update({
      name: input.name,
      description: input.description,
      contribution_amount: input.contributionAmount,
      cadence: input.cadence,
      interest_rate: input.interestRate,
      vote_threshold: input.voteThreshold,
      savings_goal_name: input.savingsGoalName,
      savings_goal_amount: input.savingsGoalAmount,
      savings_goal_date: input.savingsGoalDate,
    })
    .eq('id', input.groupId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/groups/${input.groupId}`)
  revalidatePath(`/groups/${input.groupId}/admin`)
  return { ok: true }
}

export async function toggleInviteActive(
  groupId: string,
  active: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const gate = await assertAdmin(groupId)
  if ('error' in gate) return { ok: false, error: gate.error }

  const { error } = await gate.supabase
    .from('groups')
    .update({ invite_active: active })
    .eq('id', groupId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/admin`)
  return { ok: true }
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(admin): server actions for group settings + invite toggle"
```

---

## Task 8: Admin index page + settings form + invite controls

**Files:**
- Create: `app/(app)/groups/[groupId]/admin/settings-form.tsx`
- Create: `app/(app)/groups/[groupId]/admin/invite-controls.tsx`
- Modify: `app/(app)/groups/[groupId]/admin/page.tsx`

**Interfaces:**
- Consumes: `updateGroupSettings`, `toggleInviteActive` from `./actions`; existing `InviteLink` component from `@/components/group/invite-link`
- Produces: A working `/groups/[groupId]/admin` page

- [ ] **Step 1: Create the settings form**

Create `app/(app)/groups/[groupId]/admin/settings-form.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import {
  updateGroupSettings,
  type GroupSettingsInput,
} from './actions'

export function SettingsForm({ initial }: { initial: GroupSettingsInput }) {
  const [form, setForm] = useState<GroupSettingsInput>(initial)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await updateGroupSettings(form)
      if (result.ok) setStatus({ kind: 'ok' })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  function set<K extends keyof GroupSettingsInput>(
    key: K,
    value: GroupSettingsInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const inputCls =
    'w-full rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft'
  const labelCls =
    'text-xs font-bold uppercase tracking-widest text-body-subtle'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Name</label>
        <input
          className={inputCls}
          type="text"
          maxLength={80}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} min-h-[80px]`}
          maxLength={500}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Contribution amount (AMBPHP)</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            max={1_000_000}
            value={form.contributionAmount}
            onChange={(e) => set('contributionAmount', Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Cadence</label>
          <select
            className={inputCls}
            value={form.cadence}
            onChange={(e) =>
              set('cadence', e.target.value as GroupSettingsInput['cadence'])
            }
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Interest rate (% / month)</label>
          <input
            className={inputCls}
            type="number"
            step="0.1"
            min={0}
            max={10}
            value={form.interestRate}
            onChange={(e) => set('interestRate', Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Vote threshold</label>
          <select
            className={inputCls}
            value={form.voteThreshold}
            onChange={(e) =>
              set(
                'voteThreshold',
                e.target.value as GroupSettingsInput['voteThreshold'],
              )
            }
          >
            <option value="majority">Majority</option>
            <option value="two_thirds">Two-thirds</option>
            <option value="unanimous">Unanimous</option>
          </select>
        </div>
      </div>

      <div className="border-t-2 border-border-default pt-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-body-subtle">
          Savings goal (optional)
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            className={inputCls}
            type="text"
            placeholder="Name"
            maxLength={80}
            value={form.savingsGoalName ?? ''}
            onChange={(e) =>
              set('savingsGoalName', e.target.value || null)
            }
          />
          <input
            className={inputCls}
            type="number"
            placeholder="Amount"
            min={0}
            value={form.savingsGoalAmount ?? ''}
            onChange={(e) =>
              set(
                'savingsGoalAmount',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
          <input
            className={inputCls}
            type="date"
            value={form.savingsGoalDate ?? ''}
            onChange={(e) =>
              set('savingsGoalDate', e.target.value || null)
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-100',
            pending
              ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </button>
        {status.kind === 'ok' && (
          <p className="text-xs font-semibold text-fg-brand-strong">Saved.</p>
        )}
        {status.kind === 'err' && (
          <p className="text-xs font-semibold text-danger-strong">
            {status.error}
          </p>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create the invite controls**

Create `app/(app)/groups/[groupId]/admin/invite-controls.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { InviteLink } from '@/components/group/invite-link'
import { toggleInviteActive } from './actions'

export function InviteControls({
  groupId,
  token,
  initialActive,
}: {
  groupId: string
  token: string | null
  initialActive: boolean
}) {
  const [active, setActive] = useState(initialActive)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onToggle() {
    setError(null)
    const next = !active
    startTransition(async () => {
      const result = await toggleInviteActive(groupId, next)
      if (result.ok) setActive(next)
      else setError(result.error)
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {active && token && <InviteLink token={token} />}
      {!active && (
        <p className="text-sm text-body-subtle">
          Invite link is disabled. New members cannot join.
        </p>
      )}
      <button
        type="button"
        onClick={onToggle}
        disabled={pending}
        className={[
          'inline-flex items-center justify-center gap-2 self-start rounded-xl border-2 px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all duration-100',
          pending
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : active
              ? 'border-border-danger bg-neutral-primary text-danger-strong hover:bg-danger-soft'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {active ? 'Revoke invite link' : 'Reactivate invite link'}
      </button>
      {error && (
        <p className="text-xs font-semibold text-danger-strong">{error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rewrite the admin page**

Replace `app/(app)/groups/[groupId]/admin/page.tsx` with:

```tsx
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
              const name =
                (m as any).profiles?.full_name ?? 'Member'
              return (
                <li
                  key={m.user_id as string}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p className="font-semibold text-heading">{name}</p>
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
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Manual smoke test**

```bash
npm run dev
```

- Open `/groups/<yourGroup>/admin` as the group admin.
- Verify the three navigation tiles (Defaults, End cycle, Export) render and link correctly.
- Edit the group name, click Save. Expect "Saved." Reload — the field persists; the group sidebar heading updates.
- Toggle "Revoke invite link". Confirm the link disappears and the copy shows "Invite link is disabled." Toggle "Reactivate" — the link comes back.
- Confirm the member list shows each member with their streak and total contributed.
- Open the admin page as a non-admin — expect redirect to `/groups/<id>`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(admin): group settings, invite controls, member list"
```

---

## Self-Review

### Spec coverage

- `/notifications` (spec §5.5 #16 — "Chronological alerts…timestamped, deep-linked"): Task 3 renders a chronological list with timestamps and deep links via the mapper. Icons chosen per notification type. Handled types cover every emitter in the codebase (`contribution_reminder`, `repayment_reminder`, `default_escalation`, `cycle_distribution`).
- `/settings` (spec §5.5 #17 — "Account details (name, email, password), wallet mode toggle, email notification preferences"): Task 6 ships name update, password change, email display (read-only), wallet mode display (read-only). Email change, email preferences, and Freighter toggle are called out as deferred in Global Constraints.
- `/groups/[groupId]/admin` (spec §5.4 #13 — "Group settings, invite link, member list; cosmetic edits immediate; financial edits vote-proposal"): Task 8 ships all fields as immediate edits, with the deferral note visible in the UI ("Financial changes … apply immediately in this build. A vote-proposal flow will be added post-hackathon."). Invite link supports copy + revoke + reactivate. Member list shows name, join date, streak, total contributed.

### Placeholder scan

No "TODO", "TBD", "similar to Task N", or generic error-handling placeholders in the plan. Every code step contains complete code. Every command has an expected outcome.

### Type consistency

- `GroupSettingsInput` defined once in Task 7, imported by Task 8's `settings-form.tsx` and by the admin `page.tsx` for constructing the initial value.
- `NotificationRowData` defined and exported from `notification-row.tsx` in Task 3, consumed by `page.tsx` in the same task.
- `NotificationType` and `NotificationIconName` defined in Task 1's `lib/notification-links.ts`; Task 3's row component imports the mapper functions (not the types directly, which is fine).
- Server action return shapes are uniform: `{ ok: true, ... } | { ok: false, error: string }` across all six actions in this plan.
- Icon names emitted by `notificationIconName()` in Task 1 exactly match the keys in the `ICONS` map in Task 3's row component.

No mismatches found.

---

## Deferred (not in this plan)

- Email address change flow
- Email notification preferences per event type
- Freighter opt-in / wallet mode toggle
- Vote-proposal flow for financial-parameter changes on the admin page
- Removing a member from a group (member list is read-only in this plan)
- Realtime subscription for `/notifications` (page is force-dynamic; a browser refresh picks up new rows)
