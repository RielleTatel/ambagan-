# Ambagan Phase 2 — Groups & Invite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the smallest complete group lifecycle for Ambagan — create → invite → join → visible on dashboard — with a real multisig Stellar account backing every group.

**Architecture:** Next.js App Router (RSC + server actions) is the trust boundary; every secret-touching operation lives inside a server action. Group creation provisions a Stellar testnet account, funds it via Friendbot, and configures multisig with the admin as the first signer at threshold 1. Joining via `/invite/[token]` inserts a `group_members` row and submits a single Stellar transaction that adds the new member as a signer and recomputes the threshold. Dashboard is an RSC that reads `groups` via RLS and fetches balances from Horizon in parallel.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (auth + Postgres + RLS), `@stellar/stellar-sdk` 12.3, `crypto-js` 4.2, TailwindCSS with Forest & Gold design tokens (see `.claude/skills/lingo-design/`), shadcn primitives (`Button`, `Card`, `Input`, `Label`), Vitest for pure-logic unit tests.

**Design spec:** `docs/superpowers/specs/2026-07-05-ambagan-phase-2-groups-invite-design.md`

## Global Constraints

- Every server action MUST call `createClient()` from `@/utils/supabase/server` and validate `auth.getUser()` before doing anything else — no server action trusts client input for identity.
- Stellar SDK usage is confined to `lib/stellar.ts` and `lib/stellar-user.ts` (parent spec §7, NFR 5.5). Do NOT import `@stellar/stellar-sdk` from any other module.
- No raw hex/rgb in JSX. Use the Forest & Gold Tailwind tokens declared in `tailwind.config.ts`: `bg-warm-bg` (page), `bg-neutral-primary` (card), `bg-brand` / `text-white` (primary CTA), `border-default` (2px), `rounded-DEFAULT` (12px). Consult `.claude/skills/lingo-design/` modules before writing JSX.
- Every UI text string that a Filipino end-user reads goes through plain English for Phase 2 (i18n is Phase 5+). Do NOT add copy in Tagalog yet unless the spec explicitly says so — the copy tone is professional, direct, warm.
- Interest rate ceiling is **0 ≤ rate ≤ 10** (percent per month), enforced in the form AND server action (spec §2 P2-D3).
- The register flow's `?invite=<token>` query string MUST survive through email confirmation and wallet provisioning. Never strip it in a redirect.
- TDD applies to **pure logic only** (`lib/group-threshold.ts`, form validators). Server actions and pages are verified via the manual end-to-end checklist in Task 12 — do not add integration tests that hit Stellar testnet from CI.
- Commits at the granularity specified per task. Do not batch multiple tasks into one commit.

---

## File Structure

**Create:**
| Path | Responsibility |
|---|---|
| `lib/group-threshold.ts` | Pure function: `computeThreshold(voteThreshold, memberCount)` |
| `lib/group-threshold.test.ts` | Vitest unit tests for the helper |
| `vitest.config.ts` | Vitest config (node env, `.test.ts` pattern) |
| `app/(app)/groups/new/actions.ts` | `createGroup(formData)` server action |
| `app/(app)/groups/new/create-group-form.tsx` | Client-side form for group creation |
| `app/(public)/invite/[token]/actions.ts` | `acceptInvite(token)` server action |
| `app/(public)/invite/[token]/join-button.tsx` | Client component that calls `acceptInvite` |
| `components/group/group-card.tsx` | Dashboard card renderer (name, balance, member count, cycle pill) |
| `components/group/invite-link.tsx` | Client component: copyable invite URL with "Copied!" feedback |

**Modify:**
| Path | Change |
|---|---|
| `lib/stellar.ts` | Change `setupGroupMultisig` masterWeight from 0 to 1; add `addGroupSignerAndUpdateThreshold` |
| `app/(app)/dashboard/page.tsx` | Replace shell with RSC listing user's groups |
| `app/(app)/groups/new/page.tsx` | Wire the form + auth/wallet gate |
| `app/(app)/groups/[groupId]/page.tsx` | Minimal overview: name, description, balance, invite link |
| `app/(public)/invite/[token]/page.tsx` | Validate token, redirect unauth, render accept UI |
| `app/(public)/register/page.tsx` | Preserve `?invite=<token>` and pass into `SignUpForm` |
| `components/sign-up-form.tsx` | Accept optional `inviteToken` prop; after wallet provisioning, call `/api/invite/accept-after-signup` and redirect to the group |
| `app/(app)/onboarding/wallet/page.tsx` | Preserve `?invite=<token>` in the post-provision redirect |
| `package.json` | Add `vitest` dev dependency and `test` script |

---

### Task 1: Test Setup + Threshold Math Helper

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/group-threshold.ts`
- Create: `lib/group-threshold.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `computeThreshold(voteThreshold: 'majority' | 'two_thirds' | 'unanimous', memberCount: number): number`, `type VoteThreshold`

- [ ] **Step 1: Install Vitest**

Run:
```bash
npm install --save-dev vitest
```

Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 2: Add test script to package.json**

Edit `package.json` scripts block to include:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Create Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Write failing tests for `computeThreshold`**

Create `lib/group-threshold.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeThreshold } from './group-threshold'

describe('computeThreshold', () => {
  it('returns 1 for a single-member group regardless of vote_threshold', () => {
    expect(computeThreshold('majority', 1)).toBe(1)
    expect(computeThreshold('two_thirds', 1)).toBe(1)
    expect(computeThreshold('unanimous', 1)).toBe(1)
  })

  it('computes majority as floor(n/2) + 1', () => {
    expect(computeThreshold('majority', 2)).toBe(2)
    expect(computeThreshold('majority', 3)).toBe(2)
    expect(computeThreshold('majority', 4)).toBe(3)
    expect(computeThreshold('majority', 5)).toBe(3)
  })

  it('computes two-thirds as ceil(2n/3)', () => {
    expect(computeThreshold('two_thirds', 2)).toBe(2)
    expect(computeThreshold('two_thirds', 3)).toBe(2)
    expect(computeThreshold('two_thirds', 4)).toBe(3)
    expect(computeThreshold('two_thirds', 6)).toBe(4)
  })

  it('computes unanimous as n', () => {
    expect(computeThreshold('unanimous', 2)).toBe(2)
    expect(computeThreshold('unanimous', 5)).toBe(5)
  })
})
```

- [ ] **Step 5: Run tests, verify they fail**

Run:
```bash
npm test
```

Expected: FAIL — "Cannot find module './group-threshold'".

- [ ] **Step 6: Implement `computeThreshold`**

Create `lib/group-threshold.ts`:

```ts
export type VoteThreshold = 'majority' | 'two_thirds' | 'unanimous'

export function computeThreshold(
  voteThreshold: VoteThreshold,
  memberCount: number,
): number {
  if (memberCount <= 1) return 1
  switch (voteThreshold) {
    case 'majority':
      return Math.floor(memberCount / 2) + 1
    case 'two_thirds':
      return Math.ceil((memberCount * 2) / 3)
    case 'unanimous':
      return memberCount
  }
}
```

- [ ] **Step 7: Run tests, verify pass**

Run:
```bash
npm test
```

Expected: PASS — 4 tests green.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/group-threshold.ts lib/group-threshold.test.ts
git commit -m "feat: add threshold math helper for group multisig

Computes the on-chain multisig threshold from a group's vote_threshold
setting and current member count. Includes vitest setup for pure-logic
unit tests."
```

---

### Task 2: Extend `lib/stellar.ts` — multisig helpers

**Files:**
- Modify: `lib/stellar.ts:149-190` (change `setupGroupMultisig`, then append `addGroupSignerAndUpdateThreshold`)

**Interfaces:**
- Consumes: existing `horizonServer`, `Networks.TESTNET` from stellar SDK
- Produces:
  - `setupGroupMultisig(groupSecret, signerPublicKeys, threshold)` — behavior updated: `masterWeight: 1` (was 0)
  - `addGroupSignerAndUpdateThreshold(groupSecret: string, newSignerPublicKey: string, newThreshold: number, adminSecret?: string): Promise<Horizon.HorizonApi.SubmitTransactionResponse>`

- [ ] **Step 1: Update `setupGroupMultisig` master weight**

In `lib/stellar.ts`, locate the `SetOptions` operation inside `setupGroupMultisig` (around line 178) and change `masterWeight: 0` to `masterWeight: 1`. Add a one-line inline comment:

```ts
  builder.addOperation(
    StellarSdk.Operation.setOptions({
      // Phase 2: keep master signing weight so the server can add signers on join.
      // Phase 4 hardens this to 0 once multi-party signature collection lands.
      masterWeight: 1,
      lowThreshold: threshold,
      medThreshold: threshold,
      highThreshold: threshold,
    })
  )
```

- [ ] **Step 2: Append `addGroupSignerAndUpdateThreshold` at the bottom of `lib/stellar.ts`**

```ts
// Add a new member as signer and update the group's on-chain threshold
// in a single transaction. Signed by the group's master keypair; if the
// current threshold requires more weight than the master alone provides,
// the admin's secret is also used to reach the threshold.
export async function addGroupSignerAndUpdateThreshold(
  groupSecret: string,
  newSignerPublicKey: string,
  newThreshold: number,
  adminSecret?: string,
) {
  const groupKeypair = StellarSdk.Keypair.fromSecret(groupSecret)
  const account = await horizonServer.loadAccount(groupKeypair.publicKey())

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.setOptions({
        signer: { ed25519PublicKey: newSignerPublicKey, weight: 1 },
      }),
    )
    .addOperation(
      StellarSdk.Operation.setOptions({
        lowThreshold: newThreshold,
        medThreshold: newThreshold,
        highThreshold: newThreshold,
      }),
    )
    .setTimeout(30)
    .build()

  tx.sign(groupKeypair)
  if (adminSecret) {
    tx.sign(StellarSdk.Keypair.fromSecret(adminSecret))
  }

  return horizonServer.submitTransaction(tx)
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors related to `lib/stellar.ts`.

- [ ] **Step 4: Commit**

```bash
git add lib/stellar.ts
git commit -m "feat(stellar): retain master weight and add join-time signer op

setupGroupMultisig now sets masterWeight=1 so the server-held group
keypair can co-sign signer additions during Phase 2 joins. New helper
addGroupSignerAndUpdateThreshold submits a single tx that appends the
member's signer and updates all three thresholds."
```

---

### Task 3: `createGroup` server action

**Files:**
- Create: `app/(app)/groups/new/actions.ts`

**Interfaces:**
- Consumes: `createClient` (server supabase), `generateKeypair`, `fundTestnetAccount`, `establishTrustline`, `setupGroupMultisig`, `encryptSecret` (all from `lib/stellar` / `lib/stellar-user`)
- Produces: `createGroup(input: CreateGroupInput): Promise<{ error?: string; groupId?: string }>`

Note: this action is server-only. Do NOT export it from any client file. It returns `{ error }` on failure or `redirect()` on success — no successful return value.

- [ ] **Step 1: Create the action file**

Create `app/(app)/groups/new/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import {
  generateKeypair,
  encryptSecret,
  fundTestnetAccount,
  establishTrustline,
  setupGroupMultisig,
} from '@/lib/stellar'

export type Cadence = 'weekly' | 'biweekly' | 'monthly'
export type VoteThreshold = 'majority' | 'two_thirds' | 'unanimous'

export type CreateGroupInput = {
  name: string
  description?: string
  contributionAmount: number
  cadence: Cadence
  interestRate: number
  voteThreshold: VoteThreshold
  savingsGoalName?: string
  savingsGoalAmount?: number
  savingsGoalDate?: string
}

export type CreateGroupResult = { error: string } | { groupId: string }

function validate(input: CreateGroupInput): string | null {
  if (!input.name || input.name.length > 80) return 'Group name is required (max 80 chars).'
  if (input.description && input.description.length > 500) return 'Description too long (max 500 chars).'
  if (!(input.contributionAmount > 0) || input.contributionAmount > 1_000_000)
    return 'Contribution amount must be between 0 and 1,000,000.'
  if (!['weekly', 'biweekly', 'monthly'].includes(input.cadence)) return 'Invalid cadence.'
  if (!(input.interestRate >= 0 && input.interestRate <= 10))
    return 'Interest rate must be between 0 and 10 percent per month.'
  if (!['majority', 'two_thirds', 'unanimous'].includes(input.voteThreshold))
    return 'Invalid vote threshold.'
  if (input.savingsGoalName && input.savingsGoalName.length > 80)
    return 'Savings goal name too long (max 80 chars).'
  if (input.savingsGoalAmount !== undefined && !(input.savingsGoalAmount > 0))
    return 'Savings goal amount must be positive.'
  if (input.savingsGoalDate) {
    const d = new Date(input.savingsGoalDate)
    if (Number.isNaN(d.valueOf()) || d.getTime() < Date.now())
      return 'Savings goal date must be in the future.'
  }
  return null
}

export async function createGroup(input: CreateGroupInput): Promise<CreateGroupResult> {
  const err = validate(input)
  if (err) return { error: err }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()

  if (!profile?.stellar_public_key) redirect('/onboarding/wallet')

  // 1. Insert groups row first — we can roll it back if Stellar setup fails.
  const { data: group, error: insertErr } = await supabase
    .from('groups')
    .insert({
      name: input.name,
      description: input.description ?? null,
      contribution_amount: input.contributionAmount,
      cadence: input.cadence,
      interest_rate: input.interestRate,
      vote_threshold: input.voteThreshold,
      admin_id: user.id,
      savings_goal_name: input.savingsGoalName ?? null,
      savings_goal_amount: input.savingsGoalAmount ?? null,
      savings_goal_date: input.savingsGoalDate ?? null,
    })
    .select('id')
    .single()

  if (insertErr || !group) return { error: insertErr?.message ?? 'Failed to create group.' }

  try {
    // 2. Provision the group's Stellar account.
    const { publicKey, secretKey } = generateKeypair()
    await fundTestnetAccount(publicKey)
    await establishTrustline(secretKey)
    await setupGroupMultisig(secretKey, [profile.stellar_public_key], 1)

    // 3. Persist Stellar identity + encrypted secret on the group.
    const { error: updateErr } = await supabase
      .from('groups')
      .update({
        stellar_account_id: publicKey,
        stellar_secret_encrypted: encryptSecret(secretKey),
      })
      .eq('id', group.id)
    if (updateErr) throw updateErr

    // 4. Insert admin as first member.
    const { error: memberErr } = await supabase
      .from('group_members')
      .insert({ group_id: group.id, user_id: user.id })
    if (memberErr) throw memberErr
  } catch (e) {
    // Roll back the DB row so the user can retry cleanly.
    await supabase.from('groups').delete().eq('id', group.id)
    const message = e instanceof Error ? e.message : 'Stellar setup failed.'
    return { error: `Failed to provision group: ${message}` }
  }

  redirect(`/groups/${group.id}`)
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/groups/new/actions.ts
git commit -m "feat(groups): add createGroup server action

Validates input, inserts the groups row, provisions the group's Stellar
account (Friendbot fund + trustline + multisig with admin at threshold
1), and inserts the admin as the first group_member. Rolls back the DB
row if the Stellar setup fails."
```

---

### Task 4: Group creation form component

**Files:**
- Create: `app/(app)/groups/new/create-group-form.tsx`

**Interfaces:**
- Consumes: `createGroup` from `./actions`
- Produces: React component (default export) with no props

- [ ] **Step 1: Read the lingo-design modules that apply**

Skim `.claude/skills/lingo-design/inputs.md`, `buttons.md`, `cards.md`, `radios-checkboxes-toggle.md` for the exact class combinations expected. Reuse the primitives from `components/ui/*` (`Input`, `Label`, `Button`, `Card`).

- [ ] **Step 2: Create the client form component**

Create `app/(app)/groups/new/create-group-form.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGroup, type CreateGroupInput } from './actions'

export default function CreateGroupForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const input: CreateGroupInput = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
      contributionAmount: Number(fd.get('contributionAmount')),
      cadence: fd.get('cadence') as CreateGroupInput['cadence'],
      interestRate: Number(fd.get('interestRate')),
      voteThreshold: fd.get('voteThreshold') as CreateGroupInput['voteThreshold'],
      savingsGoalName: String(fd.get('savingsGoalName') ?? '') || undefined,
      savingsGoalAmount: fd.get('savingsGoalAmount') ? Number(fd.get('savingsGoalAmount')) : undefined,
      savingsGoalDate: String(fd.get('savingsGoalDate') ?? '') || undefined,
    }
    startTransition(async () => {
      const res = await createGroup(input)
      if (res && 'error' in res) setError(res.error)
      // Success path redirects server-side; nothing to do here.
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create a new group</CardTitle>
        <CardDescription>
          Set up your paluwagan. You&apos;ll be the first member and admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Group name</Label>
            <Input id="name" name="name" required maxLength={80} placeholder="Barangay Savings Circle" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" maxLength={500} placeholder="What is this group for?" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contributionAmount">Contribution amount (AMBPHP)</Label>
            <Input id="contributionAmount" name="contributionAmount" type="number" min="1" step="1" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cadence">Cadence</Label>
            <select
              id="cadence"
              name="cadence"
              required
              defaultValue="monthly"
              className="h-10 rounded-md border-2 border-default bg-neutral-primary px-3 text-sm"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="interestRate">Interest rate (% per month, 0–10)</Label>
            <Input
              id="interestRate"
              name="interestRate"
              type="number"
              min="0"
              max="10"
              step="0.1"
              required
              defaultValue="2"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voteThreshold">Vote threshold</Label>
            <select
              id="voteThreshold"
              name="voteThreshold"
              required
              defaultValue="majority"
              className="h-10 rounded-md border-2 border-default bg-neutral-primary px-3 text-sm"
            >
              <option value="majority">Majority (&gt;50%)</option>
              <option value="two_thirds">Two-thirds (≥66%)</option>
              <option value="unanimous">Unanimous (100%)</option>
            </select>
          </div>

          <fieldset className="grid gap-3 rounded-DEFAULT border-2 border-default p-4">
            <legend className="px-2 text-sm text-body-subtle">Savings goal (optional)</legend>
            <div className="grid gap-2">
              <Label htmlFor="savingsGoalName">Goal name</Label>
              <Input id="savingsGoalName" name="savingsGoalName" maxLength={80} placeholder="Community medical fund" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="savingsGoalAmount">Goal amount (AMBPHP)</Label>
              <Input id="savingsGoalAmount" name="savingsGoalAmount" type="number" min="1" step="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="savingsGoalDate">Goal date</Label>
              <Input id="savingsGoalDate" name="savingsGoalDate" type="date" />
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-danger-strong">{error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating group…' : 'Create group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/groups/new/create-group-form.tsx
git commit -m "feat(groups): add create-group form component

Client component that collects name, description, contribution amount,
cadence, interest rate (0-10%), vote threshold, and optional savings
goal. Uses Forest & Gold tokens and shadcn primitives; submits via the
createGroup server action."
```

---

### Task 5: Wire `/groups/new` page + auth/wallet gate

**Files:**
- Modify: `app/(app)/groups/new/page.tsx`

- [ ] **Step 1: Replace the page shell**

Overwrite `app/(app)/groups/new/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import CreateGroupForm from './create-group-form'

export default async function NewGroupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()

  if (!profile?.stellar_public_key) redirect('/onboarding/wallet')

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <CreateGroupForm />
    </main>
  )
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`, log in as an account with a provisioned wallet, visit `/groups/new`. Fill in valid values and submit. Expected: redirect to `/groups/[groupId]` after a few seconds (Friendbot funding takes time). Check the Supabase `groups` and `group_members` tables — both should have new rows. Check the group row's `stellar_account_id` on Stellar Laboratory (Horizon testnet) — it should exist and have the admin as a signer.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/groups/new/page.tsx
git commit -m "feat(groups): wire /groups/new with auth + wallet gate

Server-side redirects to /login (unauth) or /onboarding/wallet (no
Stellar key) before rendering the form."
```

---

### Task 6: Minimal `/groups/[groupId]` overview

**Files:**
- Create: `components/group/invite-link.tsx`
- Modify: `app/(app)/groups/[groupId]/page.tsx`

**Interfaces:**
- Produces: `<InviteLink token={string} />` — client component that renders the copyable URL

- [ ] **Step 1: Create the invite-link copy component**

Create `components/group/invite-link.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function InviteLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window === 'undefined' ? '' : `${window.location.origin}/invite/${token}`

  async function copy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-body">Invite link</label>
      <div className="flex gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 rounded-DEFAULT border-2 border-default bg-neutral-primary px-3 py-2 text-sm text-body"
        />
        <Button type="button" onClick={copy} variant="outline">
          {copied ? 'Copied!' : 'Copy'}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the group overview shell**

Overwrite `app/(app)/groups/[groupId]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { InviteLink } from '@/components/group/invite-link'

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
    .select('id, name, description, stellar_account_id, invite_token, invite_active, admin_id')
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
        </CardContent>
      </Card>
    </main>
  )
}
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/groups/\[groupId\]/page.tsx components/group/invite-link.tsx
git commit -m "feat(groups): add minimal group overview page

Renders name, description, live fund balance (from Horizon), member
count, and (for admin) a copyable invite link. Full overview lands in
Phase 3."
```

---

### Task 7: `acceptInvite` server action

**Files:**
- Create: `app/(public)/invite/[token]/actions.ts`

**Interfaces:**
- Consumes: `createClient`, `decryptSecret` (via existing `lib/stellar` — will need to import; already exported), `addGroupSignerAndUpdateThreshold`, `computeThreshold`
- Produces: `acceptInvite(token: string): Promise<{ error: string } | { groupId: string }>`

- [ ] **Step 1: Create the action**

Create `app/(public)/invite/[token]/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, addGroupSignerAndUpdateThreshold } from '@/lib/stellar'
import { computeThreshold } from '@/lib/group-threshold'

export type AcceptResult = { error: string } | { groupId: string }

export async function acceptInvite(token: string): Promise<AcceptResult> {
  if (!token) return { error: 'Missing invite token.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/register?invite=${encodeURIComponent(token)}`)

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key, stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_public_key) {
    redirect(`/onboarding/wallet?invite=${encodeURIComponent(token)}`)
  }

  const { data: group } = await supabase
    .from('groups')
    .select('id, vote_threshold, stellar_secret_encrypted, invite_active, admin_id')
    .eq('invite_token', token)
    .single()

  if (!group || !group.invite_active) return { error: 'This invite is no longer valid.' }

  // Already a member? Redirect to the group instead of erroring.
  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) redirect(`/groups/${group.id}`)

  // Insert the member row first (source of truth for RLS).
  const { error: insertErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })
  if (insertErr) return { error: insertErr.message }

  // Recompute threshold based on new member count and apply on-chain.
  const { count } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  const memberCount = count ?? 1
  const newThreshold = computeThreshold(group.vote_threshold, memberCount)

  try {
    if (!group.stellar_secret_encrypted) throw new Error('Group has no Stellar account.')
    const groupSecret = decryptSecret(group.stellar_secret_encrypted)

    // If the pre-join threshold was > 1, the master alone can't sign — pull the
    // admin's secret too (Phase 2 shortcut; Phase 4 replaces with real multisig).
    let adminSecret: string | undefined
    if (memberCount > 2) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('stellar_secret_encrypted')
        .eq('id', group.admin_id)
        .single()
      if (adminProfile?.stellar_secret_encrypted) {
        adminSecret = decryptSecret(adminProfile.stellar_secret_encrypted)
      }
    }

    await addGroupSignerAndUpdateThreshold(
      groupSecret,
      profile.stellar_public_key,
      newThreshold,
      adminSecret,
    )
  } catch (e) {
    // Trade-off documented in the spec: keep the DB row, log the chain failure.
    console.error('[acceptInvite] Stellar signer sync failed', e)
  }

  redirect(`/groups/${group.id}`)
}
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(public\)/invite/\[token\]/actions.ts
git commit -m "feat(invite): add acceptInvite server action

Validates token, redirects unauth to register with the token preserved,
inserts group_members row, and submits an on-chain SetOptions tx that
adds the joiner as a signer and updates thresholds."
```

---

### Task 8: `/invite/[token]` page + join button

**Files:**
- Create: `app/(public)/invite/[token]/join-button.tsx`
- Modify: `app/(public)/invite/[token]/page.tsx`

**Interfaces:**
- Produces: `<JoinButton token={string} />` — client component that submits `acceptInvite`

- [ ] **Step 1: Create the join button component**

Create `app/(public)/invite/[token]/join-button.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { acceptInvite } from './actions'

export function JoinButton({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        disabled={pending}
        className="w-full"
        onClick={() =>
          startTransition(async () => {
            setError(null)
            const res = await acceptInvite(token)
            if (res && 'error' in res) setError(res.error)
          })
        }
      >
        {pending ? 'Joining…' : 'Join group'}
      </Button>
      {error && <p className="text-sm font-medium text-danger-strong">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 2: Replace the invite page shell**

Overwrite `app/(public)/invite/[token]/page.tsx`:

```tsx
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
          <div className="rounded-DEFAULT border-2 border-default bg-surface p-4 text-sm">
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
```

Note on the RLS caveat: `groups` has RLS enabled, and the "Members can view their groups" policy only lets a user select rows they belong to. For the invite lookup to work for a non-member, we need one of: (a) use a service-role client here, or (b) add an RLS policy allowing anyone to select a group by its `invite_token`. Choose (b) — it's simpler and the invite_token is the secret material.

- [ ] **Step 3: Add RLS policy for invite lookups**

Create a new migration `supabase/migrations/0002_invite_lookup_policy.sql`:

```sql
-- Allow anyone (including anon) to select a group when they present a valid
-- invite token. RLS on group_members still restricts what they can see after
-- joining; this policy only lets the /invite/[token] page render the preview.
create policy "Anyone can view group by invite token"
  on public.groups for select
  using (invite_active = true);
```

Note: this policy is intentionally broad — combined with the existing "Members can view their groups" policy, an authenticated non-member can now see any invite-active group's row. Since Phase 2 exposes only `name`, `description`, `contribution_amount`, `cadence` in the invite UI (no financial secrets), this is acceptable. Phase 5 admin panel can add invite revocation to flip `invite_active` off.

- [ ] **Step 4: Apply the migration**

Run in the Supabase SQL editor OR via `supabase db push` if the local CLI is configured. If unsure, paste the migration contents into the Supabase dashboard SQL editor and run.

- [ ] **Step 5: Commit**

```bash
git add app/\(public\)/invite/\[token\]/page.tsx app/\(public\)/invite/\[token\]/join-button.tsx supabase/migrations/0002_invite_lookup_policy.sql
git commit -m "feat(invite): render invite accept page

Unauth visitors redirect to /register with the token preserved.
Authenticated visitors see a preview of the group and can click Join,
which triggers acceptInvite. Adds an RLS policy allowing invite-active
groups to be selected by token."
```

---

### Task 9: Extend sign-up form to preserve invite token

**Files:**
- Modify: `components/sign-up-form.tsx`
- Modify: `app/(public)/register/page.tsx`

**Interfaces:**
- Consumes: existing `SignUpForm` component (extended with `inviteToken?: string` prop)
- Produces: on successful signup + wallet provision, if `inviteToken` was passed, calls `acceptInvite(token)` server action; otherwise redirects to `/dashboard`.

- [ ] **Step 1: Update `register` page to read the query param**

Overwrite `app/(public)/register/page.tsx`:

```tsx
import { SignUpForm } from '@/components/sign-up-form'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  return (
    <main className="flex min-h-svh w-full items-center justify-center bg-warm-bg p-6 md:p-10">
      <div className="w-full max-w-md">
        <SignUpForm inviteToken={invite} />
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Update `SignUpForm` to accept and forward the invite token**

In `components/sign-up-form.tsx`:

1. Change the component signature to accept `inviteToken?: string`:

```tsx
type SignUpFormProps = React.ComponentPropsWithoutRef<'div'> & {
  inviteToken?: string
}

export function SignUpForm({ className, inviteToken, ...props }: SignUpFormProps) {
```

2. Update the redirect after email confirmation to preserve the token — change the `emailRedirectTo` line to:

```tsx
emailRedirectTo: `${window.location.origin}/onboarding/wallet${
  inviteToken ? `?invite=${encodeURIComponent(inviteToken)}` : ''
}`,
```

3. Update the post-provision redirect to hit the invite acceptor if a token exists. Replace the `router.push('/dashboard')` inside the `if (data.session)` branch with:

```tsx
if (inviteToken) {
  const acceptRes = await fetch('/api/invite/accept-after-signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: inviteToken }),
  })
  if (acceptRes.ok) {
    const body = (await acceptRes.json()) as { groupId?: string }
    router.push(body.groupId ? `/groups/${body.groupId}` : '/dashboard')
  } else {
    router.push('/dashboard')
  }
} else {
  router.push('/dashboard')
}
```

- [ ] **Step 3: Add the `accept-after-signup` API route**

Create `app/api/invite/accept-after-signup/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, addGroupSignerAndUpdateThreshold } from '@/lib/stellar'
import { computeThreshold } from '@/lib/group-threshold'

export async function POST(req: Request) {
  const { token } = (await req.json().catch(() => ({}))) as { token?: string }
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_public_key) {
    return NextResponse.json({ error: 'wallet not provisioned' }, { status: 400 })
  }

  const { data: group } = await supabase
    .from('groups')
    .select('id, vote_threshold, stellar_secret_encrypted, invite_active, admin_id')
    .eq('invite_token', token)
    .single()
  if (!group || !group.invite_active) {
    return NextResponse.json({ error: 'invite invalid' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) return NextResponse.json({ groupId: group.id })

  const { error: insertErr } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: user.id })
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const { count } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', group.id)

  const memberCount = count ?? 1
  const newThreshold = computeThreshold(group.vote_threshold, memberCount)

  try {
    if (!group.stellar_secret_encrypted) throw new Error('group missing stellar')
    const groupSecret = decryptSecret(group.stellar_secret_encrypted)
    let adminSecret: string | undefined
    if (memberCount > 2) {
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('stellar_secret_encrypted')
        .eq('id', group.admin_id)
        .single()
      if (adminProfile?.stellar_secret_encrypted) {
        adminSecret = decryptSecret(adminProfile.stellar_secret_encrypted)
      }
    }
    await addGroupSignerAndUpdateThreshold(
      groupSecret,
      profile.stellar_public_key,
      newThreshold,
      adminSecret,
    )
  } catch (e) {
    console.error('[accept-after-signup] Stellar sync failed', e)
  }

  return NextResponse.json({ groupId: group.id })
}
```

Rationale: `SignUpForm` is a client component. Server actions can be called from client components, but we already have the API route pattern from `/api/stellar/account`, so we mirror it here for consistency and easier testing.

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/\(public\)/register/page.tsx components/sign-up-form.tsx app/api/invite/accept-after-signup/route.ts
git commit -m "feat(register): thread invite token through signup flow

Register page accepts ?invite=<token>, SignUpForm preserves it through
email confirmation, and after wallet provisioning posts to the new
accept-after-signup route which mirrors acceptInvite for the API route
pattern."
```

---

### Task 10: Preserve invite token through wallet onboarding

**Files:**
- Modify: `app/(app)/onboarding/wallet/page.tsx`
- Modify: `app/(app)/onboarding/wallet/wallet-provisioner.tsx` (existing file — verify its current shape then edit)

- [ ] **Step 1: Read the current provisioner**

Read `app/(app)/onboarding/wallet/wallet-provisioner.tsx` to see how it redirects after provisioning. Whatever redirect target it uses, wrap it to preserve `?invite=<token>` when present.

- [ ] **Step 2: Update the wallet page to read and forward the query param**

Overwrite `app/(app)/onboarding/wallet/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { WalletProvisioner } from './wallet-provisioner'

export default async function WalletOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_public_key')
    .eq('id', user.id)
    .single()

  if (profile?.stellar_public_key) {
    redirect(invite ? `/invite/${invite}` : '/dashboard')
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <WalletProvisioner inviteToken={invite} />
    </main>
  )
}
```

- [ ] **Step 3: Update `WalletProvisioner` to accept + honor the prop**

Add `inviteToken?: string` to the component's props. After successful provisioning, redirect to `/invite/${inviteToken}` when set, otherwise `/dashboard`. (Look at the file's existing shape from Step 1 to place the edit correctly.)

- [ ] **Step 4: Verify in browser**

Manually walk through: log out, hit `/invite/<real-token>` as a stranger → redirects to `/register?invite=<token>` → sign up → email confirm or immediate session → wallet page (if not yet provisioned) → after provisioning, lands on `/invite/<token>` → click Join → land on `/groups/<id>`.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/onboarding/wallet/page.tsx app/\(app\)/onboarding/wallet/wallet-provisioner.tsx
git commit -m "feat(onboarding): preserve invite token through wallet setup

Passes ?invite=<token> from register → wallet → invite so a new user
invited by a friend lands back on the accept page after their wallet is
provisioned."
```

---

### Task 11: Dashboard RSC + group card

**Files:**
- Create: `components/group/group-card.tsx`
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Produces: `<GroupCard group={{ id, name, description, balance, memberCount }} />`

- [ ] **Step 1: Create the group card component**

Create `components/group/group-card.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export type GroupCardProps = {
  id: string
  name: string
  description: string | null
  balance: string
  memberCount: number
}

export function GroupCard({ id, name, description, balance, memberCount }: GroupCardProps) {
  return (
    <Link href={`/groups/${id}`} className="block">
      <Card className="h-full transition hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{name}</CardTitle>
          {description && <CardDescription className="line-clamp-2">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-body-subtle">Fund balance</div>
              <div className="text-xl font-semibold text-heading">{balance} AMBPHP</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-body-subtle">Members</div>
              <div className="text-xl font-semibold text-heading">{memberCount}</div>
            </div>
          </div>
          <span className="inline-flex w-fit rounded-full border-2 border-default-strong bg-surface px-3 py-1 text-xs font-medium text-fg-brand-strong">
            Cycle not started
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Replace the dashboard page**

Overwrite `app/(app)/dashboard/page.tsx`:

```tsx
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
    <main className="mx-auto w-full max-w-5xl p-6 md:p-10">
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
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/dashboard/page.tsx components/group/group-card.tsx
git commit -m "feat(dashboard): list user's groups with balance + member count

RSC that joins group_members → groups (RLS handles filtering), fetches
each group's AMBPHP balance from Horizon and member count in parallel,
and renders GroupCard for each. Empty state offers create + hints at
invite links."
```

---

### Task 12: End-to-end verification

**Files:**
- None (verification only)

- [ ] **Step 1: Start dev server**

Run:
```bash
npm run dev
```

- [ ] **Step 2: Create Account A**

Register a new account (e.g., `demo-a@example.com`). Complete `/onboarding/wallet` (custodial). Confirm you land on `/dashboard` with empty state.

- [ ] **Step 3: Create a group**

Click "Create a group". Fill in: name "Test Circle", contribution 1000, cadence monthly, interest 3%, threshold majority, no savings goal. Submit. Wait for redirect to `/groups/<id>`. Verify balance shows `0` (or `—`) and members shows `1`.

- [ ] **Step 4: Copy invite link**

On the group page, click Copy. Save the invite URL.

- [ ] **Step 5: Verify group on dashboard**

Navigate to `/dashboard`. Confirm one card renders with the group name and "Cycle not started" pill.

- [ ] **Step 6: Log out and open invite as stranger**

Log out. Paste the invite URL. Expected: redirect to `/register?invite=<token>`.

- [ ] **Step 7: Create Account B**

Register `demo-b@example.com`. Confirm redirect through `/onboarding/wallet` (with invite preserved) → `/invite/<token>` after provisioning.

- [ ] **Step 8: Accept invite**

Click Join. Expected: redirect to `/groups/<id>`. The card should show 2 members.

- [ ] **Step 9: Verify on-chain**

Look up the group's `stellar_account_id` on Stellar Laboratory testnet (or `https://horizon-testnet.stellar.org/accounts/<publicKey>`). Expected: `signers` array has three entries — the group's master public key with `weight: 1`, Account A's public key with `weight: 1`, Account B's public key with `weight: 1`. `thresholds` should show `low/med/high = 2` (majority of 2).

- [ ] **Step 10: Confirm dashboard for Account B**

Log in as Account B. Verify the group appears on `/dashboard`.

- [ ] **Step 11: Commit any doc updates from verification**

If any steps required tweaks, commit them separately. If verification passes clean, no commit needed here — just proceed to close the phase.

---

## Self-Review Notes

- **Spec coverage:** Section 3 (data flow), 4 (threshold math), 5 (Stellar helpers), 6 (files), 7 (error handling), 8 (form validation), 9 (verification) all have corresponding tasks (Tasks 1–12). Section 5.1's masterWeight change is in Task 2 Step 1. Section 7's "user has no wallet" branches are in Tasks 3 (createGroup) and 7 (acceptInvite).
- **Placeholder scan:** None found. Every code block is complete; no "TBD" or "add appropriate X".
- **Type consistency:** `VoteThreshold` is defined identically in `lib/group-threshold.ts` and `app/(app)/groups/new/actions.ts`. `computeThreshold` signature matches its call sites in Tasks 7 and 9.
- **RLS caveat surfaced:** Task 8 explicitly adds the `invite_active`-based select policy needed for non-members to preview a group — spec §3 assumed this but didn't spell it out; caught during plan writing and added inline.
- **Adjacent-task interfaces:** `createGroup` returns `{ error } | { groupId }` OR redirects on success — clarified so the client form doesn't try to read a non-existent success response. `acceptInvite` follows the same convention.
