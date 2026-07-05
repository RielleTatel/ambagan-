# Phase 3–5: Stellar Core, Contributions, Loans — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify the Stellar service works end-to-end via a raw SDK test script, then ship the contribution and loan flows that make the app demo-ready.

**Architecture:** Server-side custodial signing (secrets decrypted per request, never exposed to client). Server actions handle all Stellar submissions and DB writes. Two shared math utilities (`lib/cycles.ts`, `lib/loan-math.ts`) are pure functions covered by vitest. Realtime vote tallies use Supabase Realtime channels.

**Tech Stack:** Next.js 16 App Router, React 19 Server Components + Server Actions, Supabase (Postgres + Auth + Realtime), Stellar SDK 12, vitest, TypeScript.

## Global Constraints

- Never expose plaintext Stellar secrets to the client — decrypt only inside server actions or route handlers.
- Every Stellar tx result must be persisted with its hash before returning to the client (so the UI can link to stellar.expert).
- `masterWeight` stays at `1` for Phase 3–5 (Phase 6 hardens to 0 — out of scope here).
- `AMBPHP` is the app asset; never operate on native XLM balances in user-facing code.
- Use `revalidatePath` after every server-action write so the RSC data reads reflect the change.
- Testnet only: Horizon `https://horizon-testnet.stellar.org`, network passphrase `Networks.TESTNET`.
- Every task ends with a working, committable increment; commit after each task.

---

## File Structure

**New files:**
- `scripts/test-stellar.mjs` — replace stub with full end-to-end verification (Task 1)
- `lib/cycles.ts` — cycle math (Task 2)
- `lib/cycles.test.ts` — vitest for cycle math (Task 2)
- `app/(app)/groups/[groupId]/actions.ts` — `submitContribution` (Task 3)
- `components/group/contribute-button.tsx` — client button (Task 4)
- `components/group/contribution-status.tsx` — RSC status board (Task 5)
- `lib/loan-math.ts` — repayment schedule + ceiling math (Task 7)
- `lib/loan-math.test.ts` — vitest for loan math (Task 7)
- `app/(app)/groups/[groupId]/loans/actions.ts` — `requestLoan`, `voteOnLoan` (Tasks 8, 11, 13)
- `app/(app)/groups/[groupId]/loans/request/page.tsx` — RSC (Task 9)
- `app/(app)/groups/[groupId]/loans/request/loan-request-form.tsx` — client form (Task 9)
- `app/(app)/groups/[groupId]/loans/loan-card.tsx` — client card with Realtime (Task 12)

**Modified files:**
- `app/(app)/groups/[groupId]/page.tsx` — mount contribute button + status board (Task 6)
- `app/(app)/groups/[groupId]/loans/page.tsx` — replace stub with marketplace (Task 10)
- `package.json` — add `test:stellar` script (Task 1)

---

## Task 1: End-to-End Stellar Verification Script

**Files:**
- Modify: `scripts/test-stellar.mjs` (replace entire file)
- Modify: `package.json:4-9` (scripts block)

**Interfaces:**
- Consumes: env vars `STELLAR_HORIZON_URL`, `STELLAR_ISSUER_PUBLIC_KEY`, `STELLAR_ISSUER_SECRET_KEY` from `.env`
- Produces: verified working Stellar primitives (nothing importable — this is a runnable script)

- [ ] **Step 1: Add npm script**

Replace the `scripts` block in `package.json` with:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:stellar": "node --env-file=.env scripts/test-stellar.mjs"
  },
```

- [ ] **Step 2: Write the full end-to-end script**

Replace the entire contents of `scripts/test-stellar.mjs` with:

```javascript
import * as StellarSdk from '@stellar/stellar-sdk'

const HORIZON = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org'
const ISSUER_PUBLIC = process.env.STELLAR_ISSUER_PUBLIC_KEY
const ISSUER_SECRET = process.env.STELLAR_ISSUER_SECRET_KEY

if (!ISSUER_PUBLIC || !ISSUER_SECRET) {
  console.error('Missing STELLAR_ISSUER_PUBLIC_KEY or STELLAR_ISSUER_SECRET_KEY in .env')
  process.exit(1)
}

const server = new StellarSdk.Horizon.Server(HORIZON)
const NETWORK = StellarSdk.Networks.TESTNET
const AMBPHP = new StellarSdk.Asset('AMBPHP', ISSUER_PUBLIC)

const hashes = {}
const link = (h) => `https://stellar.expert/explorer/testnet/tx/${h}`

async function fund(kp) {
  const res = await fetch(`https://friendbot.stellar.org?addr=${kp.publicKey()}`)
  if (!res.ok) throw new Error(`Friendbot failed for ${kp.publicKey()}`)
  await res.json()
}

async function trustline(kp) {
  const acc = await server.loadAccount(kp.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.changeTrust({ asset: AMBPHP }))
    .setTimeout(30)
    .build()
  tx.sign(kp)
  return server.submitTransaction(tx)
}

async function mint(toPublicKey, amount) {
  const issuer = StellarSdk.Keypair.fromSecret(ISSUER_SECRET)
  const acc = await server.loadAccount(issuer.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: toPublicKey,
      asset: AMBPHP,
      amount,
    }))
    .setTimeout(30)
    .build()
  tx.sign(issuer)
  return server.submitTransaction(tx)
}

async function pay(fromKp, toPublicKey, amount) {
  const acc = await server.loadAccount(fromKp.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: toPublicKey,
      asset: AMBPHP,
      amount,
    }))
    .setTimeout(30)
    .build()
  tx.sign(fromKp)
  return server.submitTransaction(tx)
}

async function balanceAMBPHP(publicKey) {
  const acc = await server.loadAccount(publicKey)
  const b = acc.balances.find(
    (x) => x.asset_type !== 'native' && x.asset_code === 'AMBPHP' && x.asset_issuer === ISSUER_PUBLIC,
  )
  return b ? b.balance : '0'
}

async function setupMultisig(groupKp, signers, threshold) {
  const acc = await server.loadAccount(groupKp.publicKey())
  const builder = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
  for (const s of signers) {
    builder.addOperation(StellarSdk.Operation.setOptions({
      signer: { ed25519PublicKey: s, weight: 1 },
    }))
  }
  builder.addOperation(StellarSdk.Operation.setOptions({
    masterWeight: 1,
    lowThreshold: threshold,
    medThreshold: threshold,
    highThreshold: threshold,
  }))
  const tx = builder.setTimeout(30).build()
  tx.sign(groupKp)
  return server.submitTransaction(tx)
}

// ─── Scenario ─────────────────────────────────────────────

console.log('▶ Generating keypairs')
const alice = StellarSdk.Keypair.random()
const bob = StellarSdk.Keypair.random()
const carol = StellarSdk.Keypair.random()
const group = StellarSdk.Keypair.random()
console.log('  alice:', alice.publicKey())
console.log('  bob:  ', bob.publicKey())
console.log('  carol:', carol.publicKey())
console.log('  group:', group.publicKey())

console.log('▶ Friendbot funding all 4 accounts')
await Promise.all([fund(alice), fund(bob), fund(carol), fund(group)])

console.log('▶ Establishing AMBPHP trustlines')
const trustAlice = await trustline(alice)
hashes.trustAlice = trustAlice.hash
await trustline(bob)
await trustline(carol)
const trustGroup = await trustline(group)
hashes.trustGroup = trustGroup.hash

console.log('▶ Minting 10,000 AMBPHP to alice, bob, carol')
const mintAlice = await mint(alice.publicKey(), '10000')
hashes.mintAlice = mintAlice.hash
await mint(bob.publicKey(), '10000')
await mint(carol.publicKey(), '10000')

console.log('▶ Alice pays 500 AMBPHP → group (contribution)')
const contribute = await pay(alice, group.publicKey(), '500')
hashes.contribute = contribute.hash

const groupBal = await balanceAMBPHP(group.publicKey())
console.log('  group balance:', groupBal)
if (groupBal !== '500.0000000') throw new Error(`Expected group balance 500, got ${groupBal}`)

console.log('▶ Configuring multisig: 3 signers, threshold 2')
const multisig = await setupMultisig(
  group,
  [alice.publicKey(), bob.publicKey(), carol.publicKey()],
  2,
)
hashes.multisig = multisig.hash

console.log('▶ Negative test: disbursement signed by ONLY alice should fail')
try {
  const acc = await server.loadAccount(group.publicKey())
  const tx = new StellarSdk.TransactionBuilder(acc, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK,
  })
    .addOperation(StellarSdk.Operation.payment({
      destination: alice.publicKey(),
      asset: AMBPHP,
      amount: '100',
    }))
    .setTimeout(30)
    .build()
  tx.sign(alice)
  await server.submitTransaction(tx)
  throw new Error('Single-signature disbursement should have failed')
} catch (err) {
  if (err.message === 'Single-signature disbursement should have failed') throw err
  console.log('  ✓ single-sig rejected (as expected)')
}

console.log('▶ Disbursement signed by alice + bob (meets threshold 2)')
const acc = await server.loadAccount(group.publicKey())
const tx = new StellarSdk.TransactionBuilder(acc, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase: NETWORK,
})
  .addOperation(StellarSdk.Operation.payment({
    destination: alice.publicKey(),
    asset: AMBPHP,
    amount: '100',
  }))
  .setTimeout(30)
  .build()
tx.sign(alice)
tx.sign(bob)
const disburse = await server.submitTransaction(tx)
hashes.disburse = disburse.hash

console.log('\n─── SUCCESS ───────────────────────────────')
for (const [name, hash] of Object.entries(hashes)) {
  console.log(`${name.padEnd(14)} ${link(hash)}`)
}
```

- [ ] **Step 3: Run the script**

Run: `npm run test:stellar`
Expected output: all steps log without throwing, final section prints 6 stellar.expert links (`trustAlice`, `trustGroup`, `mintAlice`, `contribute`, `multisig`, `disburse`), and the console shows `✓ single-sig rejected (as expected)`.

If it fails, investigate before continuing — every downstream task assumes these primitives work.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-stellar.mjs package.json
git commit -m "test(stellar): full end-to-end verification script"
```

---

## Task 2: Cycle Math Utility

**Files:**
- Create: `lib/cycles.ts`
- Create: `lib/cycles.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions over dates)
- Produces:
  - `type Cadence = 'weekly' | 'biweekly' | 'monthly'`
  - `computeCurrentCycle(groupCreatedAt: Date, cadence: Cadence, now?: Date): number` — returns 1-indexed cycle number
  - `computeCycleDueDate(groupCreatedAt: Date, cadence: Cadence, cycleNumber: number): Date` — end-of-cycle deadline

- [ ] **Step 1: Write the failing tests**

Create `lib/cycles.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeCurrentCycle, computeCycleDueDate } from './cycles'

describe('computeCurrentCycle', () => {
  it('returns 1 on the day the group is created', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    expect(computeCurrentCycle(created, 'weekly', created)).toBe(1)
  })

  it('rolls to cycle 2 after one week for weekly cadence', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-08T00:00:00Z')
    expect(computeCurrentCycle(created, 'weekly', now)).toBe(2)
  })

  it('rolls to cycle 2 after 14 days for biweekly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-15T00:00:00Z')
    expect(computeCurrentCycle(created, 'biweekly', now)).toBe(2)
  })

  it('rolls to cycle 2 after 30 days for monthly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-31T00:00:00Z')
    expect(computeCurrentCycle(created, 'monthly', now)).toBe(2)
  })
})

describe('computeCycleDueDate', () => {
  it('returns end of cycle 1 as created + cycle length for weekly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const due = computeCycleDueDate(created, 'weekly', 1)
    expect(due.toISOString()).toBe('2026-01-08T00:00:00.000Z')
  })

  it('returns end of cycle 3 for monthly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const due = computeCycleDueDate(created, 'monthly', 3)
    expect(due.toISOString()).toBe('2026-03-31T00:00:00.000Z')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- cycles`
Expected: FAIL with "Cannot find module './cycles'"

- [ ] **Step 3: Implement the module**

Create `lib/cycles.ts`:

```typescript
export type Cadence = 'weekly' | 'biweekly' | 'monthly'

const CYCLE_DAYS: Record<Cadence, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

export function computeCurrentCycle(
  groupCreatedAt: Date,
  cadence: Cadence,
  now: Date = new Date(),
): number {
  const days = (now.getTime() - groupCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(days / CYCLE_DAYS[cadence]) + 1
}

export function computeCycleDueDate(
  groupCreatedAt: Date,
  cadence: Cadence,
  cycleNumber: number,
): Date {
  const ms = CYCLE_DAYS[cadence] * cycleNumber * 24 * 60 * 60 * 1000
  return new Date(groupCreatedAt.getTime() + ms)
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- cycles`
Expected: PASS all 6 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/cycles.ts lib/cycles.test.ts
git commit -m "feat(lib): cycle number and due-date math"
```

---

## Task 3: `submitContribution` Server Action

**Files:**
- Create: `app/(app)/groups/[groupId]/actions.ts`

**Interfaces:**
- Consumes: `computeCurrentCycle`, `computeCycleDueDate` from Task 2; `sendAMBPHP`, `decryptSecret` from `lib/stellar.ts`
- Produces: `submitContribution(groupId: string): Promise<{ ok: true, txHash: string } | { ok: false, error: string }>`

- [ ] **Step 1: Create the action file**

Create `app/(app)/groups/[groupId]/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, sendAMBPHP } from '@/lib/stellar'
import { computeCurrentCycle, computeCycleDueDate, type Cadence } from '@/lib/cycles'

export async function submitContribution(
  groupId: string,
): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id, contribution_streak')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member of this group' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, stellar_account_id, contribution_amount, cadence, created_at')
    .eq('id', groupId)
    .single()
  if (!group || !group.stellar_account_id) {
    return { ok: false, error: 'Group not found or missing Stellar account' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_secret_encrypted) {
    return { ok: false, error: 'Wallet not provisioned' }
  }

  const cadence = group.cadence as Cadence
  const groupCreated = new Date(group.created_at)
  const cycleNumber = computeCurrentCycle(groupCreated, cadence)
  const dueDate = computeCycleDueDate(groupCreated, cadence, cycleNumber)

  const { data: existing } = await supabase
    .from('contributions')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .eq('cycle_number', cycleNumber)
    .eq('status', 'confirmed')
    .maybeSingle()
  if (existing) return { ok: false, error: 'Already contributed this cycle' }

  let txHash: string
  try {
    const secret = decryptSecret(profile.stellar_secret_encrypted)
    const result = await sendAMBPHP(
      secret,
      group.stellar_account_id,
      String(group.contribution_amount),
    )
    txHash = result.hash
  } catch (err) {
    return { ok: false, error: `Stellar payment failed: ${(err as Error).message}` }
  }

  const { error: insertErr } = await supabase.from('contributions').insert({
    group_id: groupId,
    user_id: user.id,
    amount: group.contribution_amount,
    cycle_number: cycleNumber,
    stellar_tx_hash: txHash,
    status: 'confirmed',
    due_date: dueDate.toISOString().slice(0, 10),
    paid_at: new Date().toISOString(),
  })
  if (insertErr) return { ok: false, error: `DB insert failed: ${insertErr.message}` }

  await supabase
    .from('group_members')
    .update({
      contribution_streak: (membership.contribution_streak ?? 0) + 1,
      total_contributed: group.contribution_amount,
    })
    .eq('id', membership.id)

  revalidatePath(`/groups/${groupId}`)
  return { ok: true, txHash }
}
```

- [ ] **Step 2: Type-check the file**

Run: `npx tsc --noEmit`
Expected: no errors related to `app/(app)/groups/[groupId]/actions.ts`. If there are unrelated errors from the rest of the codebase, ignore them — only the new file must be clean.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/actions.ts"
git commit -m "feat(contributions): submitContribution server action"
```

---

## Task 4: `ContributeButton` Client Component

**Files:**
- Create: `components/group/contribute-button.tsx`

**Interfaces:**
- Consumes: `submitContribution` from Task 3
- Produces: React component `<ContributeButton groupId={string} amount={number} />`

- [ ] **Step 1: Create the component**

Create `components/group/contribute-button.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { submitContribution } from '@/app/(app)/groups/[groupId]/actions'

export function ContributeButton({
  groupId,
  amount,
}: {
  groupId: string
  amount: number
}) {
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok'; txHash: string } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onClick() {
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await submitContribution(groupId)
      if (result.ok) setStatus({ kind: 'ok', txHash: result.txHash })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={onClick} disabled={pending}>
        {pending ? 'Sending…' : `Contribute ${amount} AMBPHP`}
      </Button>
      {status.kind === 'ok' && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${status.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm underline text-body-subtle"
        >
          View on Stellar Expert
        </a>
      )}
      {status.kind === 'err' && (
        <p className="text-sm text-red-600">{status.error}</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add components/group/contribute-button.tsx
git commit -m "feat(contributions): ContributeButton client component"
```

---

## Task 5: `ContributionStatus` Server Component

**Files:**
- Create: `components/group/contribution-status.tsx`

**Interfaces:**
- Consumes: `computeCurrentCycle` from Task 2; Supabase server client
- Produces: React server component `<ContributionStatus groupId={string} />`

- [ ] **Step 1: Create the component**

Create `components/group/contribution-status.tsx`:

```tsx
import { createClient } from '@/utils/supabase/server'
import { computeCurrentCycle, type Cadence } from '@/lib/cycles'
import { CheckCircle2, Clock } from 'lucide-react'

export async function ContributionStatus({ groupId }: { groupId: string }) {
  const supabase = await createClient()

  const { data: group } = await supabase
    .from('groups')
    .select('cadence, created_at')
    .eq('id', groupId)
    .single()
  if (!group) return null

  const cycleNumber = computeCurrentCycle(
    new Date(group.created_at),
    group.cadence as Cadence,
  )

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, profiles(id, full_name)')
    .eq('group_id', groupId)

  const { data: contributions } = await supabase
    .from('contributions')
    .select('user_id, stellar_tx_hash')
    .eq('group_id', groupId)
    .eq('cycle_number', cycleNumber)
    .eq('status', 'confirmed')

  const paidByUser = new Map(
    (contributions ?? []).map((c) => [c.user_id, c.stellar_tx_hash]),
  )

  return (
    <div className="rounded border-2 border-border-default bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Cycle {cycleNumber} contributions</h3>
      </div>
      <ul className="flex flex-col gap-2">
        {(members ?? []).map((m: any) => {
          const paid = paidByUser.has(m.user_id)
          const txHash = paidByUser.get(m.user_id)
          return (
            <li key={m.user_id} className="flex items-center justify-between text-sm">
              <span>{m.profiles?.full_name ?? m.user_id}</span>
              {paid ? (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-green-700"
                >
                  <CheckCircle2 className="h-4 w-4" /> Paid
                </a>
              ) : (
                <span className="flex items-center gap-1 text-body-subtle">
                  <Clock className="h-4 w-4" /> Pending
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add components/group/contribution-status.tsx
git commit -m "feat(contributions): ContributionStatus RSC board"
```

---

## Task 6: Wire Contribution Flow into Group Overview

**Files:**
- Modify: `app/(app)/groups/[groupId]/page.tsx`

**Interfaces:**
- Consumes: `ContributeButton` (Task 4), `ContributionStatus` (Task 5)
- Produces: updated `/groups/[groupId]` page

- [ ] **Step 1: Add imports and mount both components**

At the top of `app/(app)/groups/[groupId]/page.tsx`, after existing imports, add:

```tsx
import { ContributeButton } from '@/components/group/contribute-button'
import { ContributionStatus } from '@/components/group/contribution-status'
```

Inside the page's returned JSX, immediately after the existing "Group balance" section (or near the group's main info block), insert:

```tsx
<section className="mt-6 flex flex-col gap-4">
  <ContributeButton groupId={group.id} amount={Number(group.contribution_amount)} />
  <ContributionStatus groupId={group.id} />
</section>
```

If the existing page doesn't select `contribution_amount`, add it to the `select()` string.

- [ ] **Step 2: Verify visually**

Run: `npm run dev`
Open `http://localhost:3000/groups/<any-existing-group-id>` while logged in.
Expected: the contribute button renders with the group's amount, clicking it sends AMBPHP on-chain, the tx hash link appears, the status board updates on refresh.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/page.tsx"
git commit -m "feat(contributions): mount contribute button + status on group overview"
```

---

## Task 7: Loan Math Utilities

**Files:**
- Create: `lib/loan-math.ts`
- Create: `lib/loan-math.test.ts`

**Interfaces:**
- Consumes: nothing (pure functions)
- Produces:
  - `type RepaymentInstallment = { installmentNumber: number; principal: number; interest: number; amountDue: number }`
  - `computeRepaymentSchedule(amount: number, months: number, interestRate: number): RepaymentInstallment[]` — `interestRate` is annual rate as decimal (e.g., 0.12 = 12%)
  - `computeMemberLoanCeiling(groupBalance: number, memberCount: number): number` — max loan a single member can request

- [ ] **Step 1: Write the failing tests**

Create `lib/loan-math.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { computeRepaymentSchedule, computeMemberLoanCeiling } from './loan-math'

describe('computeRepaymentSchedule', () => {
  it('splits principal evenly with 0% interest', () => {
    const schedule = computeRepaymentSchedule(1200, 4, 0)
    expect(schedule).toHaveLength(4)
    expect(schedule.every((s) => s.principal === 300)).toBe(true)
    expect(schedule.every((s) => s.interest === 0)).toBe(true)
    expect(schedule.every((s) => s.amountDue === 300)).toBe(true)
  })

  it('produces monthly installments totalling principal + interest', () => {
    const schedule = computeRepaymentSchedule(1200, 12, 0.12)
    expect(schedule).toHaveLength(12)
    const total = schedule.reduce((acc, s) => acc + s.amountDue, 0)
    // With 12% annual and 12 monthly installments on 1200, simple interest total ≈ 1272
    expect(total).toBeCloseTo(1272, 0)
  })

  it('numbers installments starting at 1', () => {
    const schedule = computeRepaymentSchedule(600, 3, 0.06)
    expect(schedule.map((s) => s.installmentNumber)).toEqual([1, 2, 3])
  })
})

describe('computeMemberLoanCeiling', () => {
  it('caps at half the group balance for a single member', () => {
    expect(computeMemberLoanCeiling(1000, 5)).toBe(500)
  })

  it('returns 0 when the group has nothing', () => {
    expect(computeMemberLoanCeiling(0, 3)).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- loan-math`
Expected: FAIL with "Cannot find module './loan-math'"

- [ ] **Step 3: Implement the module**

Create `lib/loan-math.ts`:

```typescript
export type RepaymentInstallment = {
  installmentNumber: number
  principal: number
  interest: number
  amountDue: number
}

export function computeRepaymentSchedule(
  amount: number,
  months: number,
  interestRate: number,
): RepaymentInstallment[] {
  const principalPer = amount / months
  const monthlyRate = interestRate / 12
  const totalInterest = amount * monthlyRate * months
  const interestPer = totalInterest / months
  return Array.from({ length: months }, (_, i) => ({
    installmentNumber: i + 1,
    principal: round2(principalPer),
    interest: round2(interestPer),
    amountDue: round2(principalPer + interestPer),
  }))
}

export function computeMemberLoanCeiling(
  groupBalance: number,
  memberCount: number,
): number {
  if (groupBalance <= 0 || memberCount < 1) return 0
  return round2(groupBalance / 2)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- loan-math`
Expected: PASS all 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/loan-math.ts lib/loan-math.test.ts
git commit -m "feat(lib): loan repayment schedule + ceiling math"
```

---

## Task 8: `requestLoan` Server Action

**Files:**
- Create: `app/(app)/groups/[groupId]/loans/actions.ts` (initial version — grows in Tasks 11 and 13)

**Interfaces:**
- Consumes: `computeRepaymentSchedule` from Task 7; `getAMBPHPBalance` from `lib/stellar.ts`
- Produces: `requestLoan(input: { groupId: string; amount: number; purposeTag: PurposeTag; description: string; repaymentMonths: number }): Promise<{ ok: true; loanId: string } | { ok: false; error: string }>`
- Produces: `type PurposeTag = 'emergency' | 'education' | 'livelihood' | 'health' | 'other'`

- [ ] **Step 1: Create the action file**

Create `app/(app)/groups/[groupId]/loans/actions.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { computeRepaymentSchedule } from '@/lib/loan-math'

export type PurposeTag = 'emergency' | 'education' | 'livelihood' | 'health' | 'other'

const VOTING_WINDOW_HOURS = 48

export async function requestLoan(input: {
  groupId: string
  amount: number
  purposeTag: PurposeTag
  description: string
  repaymentMonths: number
}): Promise<{ ok: true; loanId: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', input.groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member of this group' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, interest_rate')
    .eq('id', input.groupId)
    .single()
  if (!group) return { ok: false, error: 'Group not found' }

  const votingClosesAt = new Date(Date.now() + VOTING_WINDOW_HOURS * 60 * 60 * 1000)

  const { data: loan, error: loanErr } = await supabase
    .from('loans')
    .insert({
      group_id: input.groupId,
      borrower_id: user.id,
      amount: input.amount,
      interest_rate: group.interest_rate,
      purpose_tag: input.purposeTag,
      description: input.description,
      repayment_months: input.repaymentMonths,
      status: 'voting',
      voting_closes_at: votingClosesAt.toISOString(),
    })
    .select('id')
    .single()
  if (loanErr || !loan) return { ok: false, error: loanErr?.message ?? 'Failed to create loan' }

  const schedule = computeRepaymentSchedule(
    input.amount,
    input.repaymentMonths,
    Number(group.interest_rate),
  )
  const now = Date.now()
  const monthMs = 30 * 24 * 60 * 60 * 1000

  const { error: repayErr } = await supabase.from('repayments').insert(
    schedule.map((s) => ({
      loan_id: loan.id,
      installment_number: s.installmentNumber,
      amount_due: s.amountDue,
      principal: s.principal,
      interest: s.interest,
      due_date: new Date(now + s.installmentNumber * monthMs).toISOString().slice(0, 10),
      status: 'pending',
    })),
  )
  if (repayErr) return { ok: false, error: `Repayment schedule insert failed: ${repayErr.message}` }

  revalidatePath(`/groups/${input.groupId}/loans`)
  return { ok: true, loanId: loan.id }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/loans/actions.ts"
git commit -m "feat(loans): requestLoan action + repayment schedule generation"
```

---

## Task 9: Loan Request Page + Form

**Files:**
- Create: `app/(app)/groups/[groupId]/loans/request/page.tsx`
- Create: `app/(app)/groups/[groupId]/loans/request/loan-request-form.tsx`

**Interfaces:**
- Consumes: `requestLoan`, `PurposeTag` from Task 8; `computeRepaymentSchedule`, `computeMemberLoanCeiling` from Task 7; `getAMBPHPBalance` from `lib/stellar.ts`
- Produces: `/groups/[groupId]/loans/request` route

- [ ] **Step 1: Create the RSC page**

Create `app/(app)/groups/[groupId]/loans/request/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { computeMemberLoanCeiling } from '@/lib/loan-math'
import { LoanRequestForm } from './loan-request-form'

export default async function LoanRequestPage({
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
    .select('id, name, interest_rate, stellar_account_id')
    .eq('id', groupId)
    .single()
  if (!group) redirect(`/groups/${groupId}`)

  const { count: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', groupId)

  const balanceStr = group.stellar_account_id
    ? await getAMBPHPBalance(group.stellar_account_id)
    : '0'
  const ceiling = computeMemberLoanCeiling(Number(balanceStr), memberCount ?? 1)

  return (
    <main className="max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">Request a loan from {group.name}</h1>
      <p className="text-sm text-body-subtle mb-4">
        Max you can request: {ceiling} AMBPHP (half of group balance).
      </p>
      <LoanRequestForm
        groupId={group.id}
        ceiling={ceiling}
        interestRate={Number(group.interest_rate)}
      />
    </main>
  )
}
```

- [ ] **Step 2: Create the client form**

Create `app/(app)/groups/[groupId]/loans/request/loan-request-form.tsx`:

```tsx
'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { computeRepaymentSchedule } from '@/lib/loan-math'
import { requestLoan, type PurposeTag } from '../actions'

const PURPOSES: PurposeTag[] = ['emergency', 'education', 'livelihood', 'health', 'other']

export function LoanRequestForm({
  groupId,
  ceiling,
  interestRate,
}: {
  groupId: string
  ceiling: number
  interestRate: number
}) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState<PurposeTag>('emergency')
  const [description, setDescription] = useState('')
  const [months, setMonths] = useState('6')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const schedule = useMemo(() => {
    const a = Number(amount)
    const m = Number(months)
    if (!a || !m || a <= 0 || m <= 0) return []
    return computeRepaymentSchedule(a, m, interestRate)
  }, [amount, months, interestRate])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const a = Number(amount)
    if (!a || a <= 0) return setError('Enter an amount greater than 0')
    if (a > ceiling) return setError(`Amount exceeds your ceiling (${ceiling} AMBPHP)`)
    if (!description.trim()) return setError('Description is required')

    startTransition(async () => {
      const result = await requestLoan({
        groupId,
        amount: a,
        purposeTag: purpose,
        description: description.trim(),
        repaymentMonths: Number(months),
      })
      if (result.ok) router.push(`/groups/${groupId}/loans`)
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Amount (AMBPHP)</span>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded border-2 border-border-default bg-surface p-2"
          max={ceiling}
          min={1}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Purpose</span>
        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value as PurposeTag)}
          className="rounded border-2 border-border-default bg-surface p-2"
        >
          {PURPOSES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="rounded border-2 border-border-default bg-surface p-2"
          rows={3}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Repayment months</span>
        <input
          type="number"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="rounded border-2 border-border-default bg-surface p-2"
          min={1}
          max={24}
        />
      </label>

      {schedule.length > 0 && (
        <div className="rounded border-2 border-border-default bg-surface p-4">
          <p className="mb-2 text-sm font-medium">Preview</p>
          <ul className="text-sm">
            {schedule.map((s) => (
              <li key={s.installmentNumber} className="flex justify-between">
                <span>Month {s.installmentNumber}</span>
                <span>
                  {s.amountDue} AMBPHP (P {s.principal} + I {s.interest})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Submitting…' : 'Submit request'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Navigate to `/groups/<groupId>/loans/request`.
Expected: ceiling shown, form renders, entering an amount + months live-updates the preview, submitting redirects to `/groups/<groupId>/loans` and a row appears in the `loans` table.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/groups/[groupId]/loans/request"
git commit -m "feat(loans): loan request page + form with live schedule preview"
```

---

## Task 10: Loans Marketplace Page (Read-Only)

**Files:**
- Modify: `app/(app)/groups/[groupId]/loans/page.tsx` (replace stub)

**Interfaces:**
- Consumes: Supabase server client
- Produces: `/groups/[groupId]/loans` route showing all loans in the group

- [ ] **Step 1: Replace the stub page**

Overwrite `app/(app)/groups/[groupId]/loans/page.tsx` with:

```tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'

export default async function LoansPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans } = await supabase
    .from('loans')
    .select('id, amount, purpose_tag, description, status, borrower_id, voting_closes_at, created_at, profiles:borrower_id(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Loans</h1>
        <Link href={`/groups/${groupId}/loans/request`}>
          <Button>Request a loan</Button>
        </Link>
      </div>

      {(!loans || loans.length === 0) && (
        <p className="text-sm text-body-subtle">No loans yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {(loans ?? []).map((loan: any) => (
          <li
            key={loan.id}
            className="rounded border-2 border-border-default bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {loan.amount} AMBPHP — {loan.purpose_tag}
                </p>
                <p className="text-sm text-body-subtle">
                  by {loan.profiles?.full_name ?? loan.borrower_id}
                </p>
                {loan.description && (
                  <p className="mt-1 text-sm">{loan.description}</p>
                )}
              </div>
              <span className="rounded bg-mint-100 px-2 py-1 text-xs">
                {loan.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Verify visually**

Run: `npm run dev`. Navigate to `/groups/<groupId>/loans`.
Expected: any loans you created in Task 9 appear.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/loans/page.tsx"
git commit -m "feat(loans): marketplace page listing all group loans"
```

---

## Task 11: `voteOnLoan` Server Action (No Disbursement Yet)

**Files:**
- Modify: `app/(app)/groups/[groupId]/loans/actions.ts` (append `voteOnLoan`)

**Interfaces:**
- Consumes: `computeThreshold` from `lib/group-threshold.ts`
- Produces: `voteOnLoan(input: { loanId: string; groupId: string; vote: 'approve' | 'deny' }): Promise<{ ok: true; approved: boolean } | { ok: false; error: string }>` — `approved: true` means threshold reached (disbursement wired in Task 13)

- [ ] **Step 1: Append the action**

Append to `app/(app)/groups/[groupId]/loans/actions.ts`:

```typescript
import { computeThreshold, type VoteThreshold } from '@/lib/group-threshold'

export async function voteOnLoan(input: {
  loanId: string
  groupId: string
  vote: 'approve' | 'deny'
}): Promise<{ ok: true; approved: boolean } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', input.groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member' }

  const { error: voteErr } = await supabase.from('votes').insert({
    loan_id: input.loanId,
    voter_id: user.id,
    vote: input.vote,
  })
  if (voteErr) return { ok: false, error: `Vote insert failed: ${voteErr.message}` }

  const { data: group } = await supabase
    .from('groups')
    .select('vote_threshold')
    .eq('id', input.groupId)
    .single()
  if (!group) return { ok: false, error: 'Group not found' }

  const { count: memberCount } = await supabase
    .from('group_members')
    .select('id', { count: 'exact', head: true })
    .eq('group_id', input.groupId)

  const { count: approveCount } = await supabase
    .from('votes')
    .select('id', { count: 'exact', head: true })
    .eq('loan_id', input.loanId)
    .eq('vote', 'approve')

  const threshold = computeThreshold(
    group.vote_threshold as VoteThreshold,
    memberCount ?? 1,
  )
  const approved = (approveCount ?? 0) >= threshold

  if (approved) {
    await supabase
      .from('loans')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', input.loanId)
  }

  revalidatePath(`/groups/${input.groupId}/loans`)
  return { ok: true, approved }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/loans/actions.ts"
git commit -m "feat(loans): voteOnLoan action with threshold check"
```

---

## Task 12: `LoanCard` with Realtime Vote Tally

**Files:**
- Create: `app/(app)/groups/[groupId]/loans/loan-card.tsx`
- Modify: `app/(app)/groups/[groupId]/loans/page.tsx` (replace inline `<li>` with `<LoanCard>`)

**Interfaces:**
- Consumes: `voteOnLoan` from Task 11
- Produces: `<LoanCard loan={LoanRow} groupId={string} currentUserId={string} />`

- [ ] **Step 1: Create the client card**

Create `app/(app)/groups/[groupId]/loans/loan-card.tsx`:

```tsx
'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { voteOnLoan } from './actions'

type LoanRow = {
  id: string
  amount: number
  purpose_tag: string
  description: string | null
  status: string
  borrower_id: string
  profiles?: { full_name: string } | null
}

export function LoanCard({
  loan,
  groupId,
  currentUserId,
  initialApproveCount,
  initialDenyCount,
  hasVoted,
}: {
  loan: LoanRow
  groupId: string
  currentUserId: string
  initialApproveCount: number
  initialDenyCount: number
  hasVoted: boolean
}) {
  const [approveCount, setApproveCount] = useState(initialApproveCount)
  const [denyCount, setDenyCount] = useState(initialDenyCount)
  const [voted, setVoted] = useState(hasVoted)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`loan-${loan.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'votes', filter: `loan_id=eq.${loan.id}` },
        (payload) => {
          const row: any = payload.new
          if (row.vote === 'approve') setApproveCount((n) => n + 1)
          else if (row.vote === 'deny') setDenyCount((n) => n + 1)
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [loan.id])

  function cast(vote: 'approve' | 'deny') {
    setError(null)
    startTransition(async () => {
      const result = await voteOnLoan({ loanId: loan.id, groupId, vote })
      if (result.ok) setVoted(true)
      else setError(result.error)
    })
  }

  const isBorrower = loan.borrower_id === currentUserId
  const canVote = !voted && !isBorrower && loan.status === 'voting'

  return (
    <li className="rounded border-2 border-border-default bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">
            {loan.amount} AMBPHP — {loan.purpose_tag}
          </p>
          <p className="text-sm text-body-subtle">
            by {loan.profiles?.full_name ?? loan.borrower_id}
          </p>
          {loan.description && <p className="mt-1 text-sm">{loan.description}</p>}
        </div>
        <span className="rounded bg-mint-100 px-2 py-1 text-xs">{loan.status}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="text-sm">
          <span className="text-green-700">✔ {approveCount}</span>
          {'  '}
          <span className="text-red-600">✘ {denyCount}</span>
        </div>
        {canVote && (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => cast('approve')} disabled={pending}>
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => cast('deny')}
              disabled={pending}
            >
              Deny
            </Button>
          </div>
        )}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </li>
  )
}
```

- [ ] **Step 2: Update the marketplace page to fetch counts and use `LoanCard`**

Overwrite `app/(app)/groups/[groupId]/loans/page.tsx` with:

```tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { LoanCard } from './loan-card'

export default async function LoansPage({
  params,
}: {
  params: Promise<{ groupId: string }>
}) {
  const { groupId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: loans } = await supabase
    .from('loans')
    .select('id, amount, purpose_tag, description, status, borrower_id, voting_closes_at, created_at, profiles:borrower_id(full_name)')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  const loanIds = (loans ?? []).map((l) => l.id)

  const { data: votes } = await supabase
    .from('votes')
    .select('loan_id, vote, voter_id')
    .in('loan_id', loanIds.length ? loanIds : ['00000000-0000-0000-0000-000000000000'])

  const tally = new Map<string, { approve: number; deny: number; mine: boolean }>()
  for (const id of loanIds) tally.set(id, { approve: 0, deny: 0, mine: false })
  for (const v of votes ?? []) {
    const t = tally.get(v.loan_id!)!
    if (v.vote === 'approve') t.approve += 1
    else t.deny += 1
    if (v.voter_id === user.id) t.mine = true
  }

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Loans</h1>
        <Link href={`/groups/${groupId}/loans/request`}>
          <Button>Request a loan</Button>
        </Link>
      </div>

      {(!loans || loans.length === 0) && (
        <p className="text-sm text-body-subtle">No loans yet.</p>
      )}

      <ul className="flex flex-col gap-3">
        {(loans ?? []).map((loan: any) => {
          const t = tally.get(loan.id)!
          return (
            <LoanCard
              key={loan.id}
              loan={loan}
              groupId={groupId}
              currentUserId={user.id}
              initialApproveCount={t.approve}
              initialDenyCount={t.deny}
              hasVoted={t.mine}
            />
          )
        })}
      </ul>
    </main>
  )
}
```

- [ ] **Step 3: Verify Realtime**

Run: `npm run dev`. Open the loans page in two browser windows (two different users, both members of the group).
Expected: when user A clicks Approve on a loan, user B's tally count for that loan increments live without a refresh.

- [ ] **Step 4: Commit**

```bash
git add "app/(app)/groups/[groupId]/loans/loan-card.tsx" "app/(app)/groups/[groupId]/loans/page.tsx"
git commit -m "feat(loans): LoanCard with Realtime vote tally"
```

---

## Task 13: Multisig Disbursement Inside `voteOnLoan`

**Files:**
- Modify: `app/(app)/groups/[groupId]/loans/actions.ts` (extend the `if (approved)` block)
- Modify: `lib/stellar.ts` — add `disburseLoan` helper

**Interfaces:**
- Consumes: `decryptSecret`, `getAMBPHP`, `horizonServer`, `computeThreshold` (already present)
- Produces: `disburseLoan(groupSecret: string, borrowerPublicKey: string, amount: string, memberSecrets: string[]): Promise<{ hash: string }>` — pays from group → borrower, signs with the group master + enough member keys to meet threshold

- [ ] **Step 1: Add `disburseLoan` to `lib/stellar.ts`**

Append to `lib/stellar.ts`:

```typescript
// Disburse a loan: pay borrower from group account, signed by group master
// plus additional member secrets to satisfy the on-chain threshold.
export async function disburseLoan(
  groupSecret: string,
  borrowerPublicKey: string,
  amount: string,
  extraSignerSecrets: string[],
): Promise<{ hash: string }> {
  const groupKp = StellarSdk.Keypair.fromSecret(groupSecret)
  const account = await horizonServer.loadAccount(groupKp.publicKey())

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: borrowerPublicKey,
        asset: getAMBPHP(),
        amount,
      }),
    )
    .setTimeout(30)
    .build()

  tx.sign(groupKp)
  for (const secret of extraSignerSecrets) {
    tx.sign(StellarSdk.Keypair.fromSecret(secret))
  }

  const result = await horizonServer.submitTransaction(tx)
  return { hash: result.hash }
}
```

- [ ] **Step 2: Wire disbursement into `voteOnLoan`**

In `app/(app)/groups/[groupId]/loans/actions.ts`, replace the existing `if (approved) { ... }` block inside `voteOnLoan` with:

```typescript
  if (approved) {
    const { data: loan } = await supabase
      .from('loans')
      .select('amount, borrower_id, status')
      .eq('id', input.loanId)
      .single()
    if (!loan) return { ok: false, error: 'Loan disappeared during disbursement' }
    if (loan.status !== 'voting') {
      // Another concurrent vote already disbursed; just return.
      revalidatePath(`/groups/${input.groupId}/loans`)
      return { ok: true, approved: true }
    }

    const { data: fullGroup } = await supabase
      .from('groups')
      .select('stellar_account_id, stellar_secret_encrypted')
      .eq('id', input.groupId)
      .single()
    if (!fullGroup?.stellar_secret_encrypted || !fullGroup.stellar_account_id) {
      return { ok: false, error: 'Group Stellar account not provisioned' }
    }

    const { data: borrowerProfile } = await supabase
      .from('profiles')
      .select('stellar_public_key')
      .eq('id', loan.borrower_id)
      .single()
    if (!borrowerProfile?.stellar_public_key) {
      return { ok: false, error: 'Borrower has no Stellar account' }
    }

    // Number of extra signers needed = threshold - 1 (the group master signs too).
    const extraNeeded = Math.max(0, threshold - 1)
    const { data: approvers } = await supabase
      .from('votes')
      .select('voter_id, profiles:voter_id(stellar_secret_encrypted)')
      .eq('loan_id', input.loanId)
      .eq('vote', 'approve')
      .limit(extraNeeded)

    const extraSecrets = (approvers ?? [])
      .map((a: any) => a.profiles?.stellar_secret_encrypted)
      .filter((s: string | null | undefined): s is string => Boolean(s))
      .map(decryptSecret)

    if (extraSecrets.length < extraNeeded) {
      return { ok: false, error: 'Not enough signer secrets available for disbursement' }
    }

    let disbursementHash: string
    try {
      const groupSecret = decryptSecret(fullGroup.stellar_secret_encrypted)
      const result = await disburseLoan(
        groupSecret,
        borrowerProfile.stellar_public_key,
        String(loan.amount),
        extraSecrets,
      )
      disbursementHash = result.hash
    } catch (err) {
      return { ok: false, error: `Disbursement failed: ${(err as Error).message}` }
    }

    await supabase
      .from('loans')
      .update({
        status: 'disbursed',
        approved_at: new Date().toISOString(),
        disbursed_at: new Date().toISOString(),
        stellar_tx_hash: disbursementHash,
      })
      .eq('id', input.loanId)
  }
```

And update the imports at the top of `actions.ts` to include:

```typescript
import { decryptSecret, disburseLoan } from '@/lib/stellar'
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: End-to-end verify**

With a group of 3 members and vote_threshold `majority` (threshold = 2):
1. Member A requests a loan for 100 AMBPHP.
2. Member B votes Approve → loan status becomes `approved` but not yet `disbursed` (since threshold requires 2 approves and only 1 exists).

Wait — re-read the code. Threshold is 2, so B alone shouldn't trigger. After **A already has the request**, B and C both need to vote approve. Actually — the borrower doesn't vote, so only B and C can vote. If both approve, threshold is met.

Correcting the demo path:
1. A requests loan.
2. B votes Approve. approveCount = 1, threshold = 2, no disbursement.
3. C votes Approve. approveCount = 2, threshold reached. Disbursement fires: pays A from group, using group master + B's secret (extraNeeded = 1).
4. A's Stellar balance goes up by 100 AMBPHP; loan status = `disbursed`; `stellar_tx_hash` set; row visible on stellar.expert.

Expected: verify all four bullets by refreshing the loans page after C's vote and checking the linked tx.

- [ ] **Step 5: Commit**

```bash
git add lib/stellar.ts "app/(app)/groups/[groupId]/loans/actions.ts"
git commit -m "feat(loans): multisig disbursement on approval threshold"
```

---

## Self-Review Notes

- **Spec coverage:** Phase 3 (test script), Phase 4 (submit + status + overview integration), Phase 5 (request form + marketplace + voting + Realtime + disbursement) are all covered.
- **Cycle math:** Task 2 uses 30-day months for simplicity — good enough for hackathon; calendar-accurate months are a Phase 6+ concern.
- **Concurrency race:** Task 13 handles the race where two members' votes both meet the threshold simultaneously — the `loan.status !== 'voting'` guard prevents double disbursement.
- **Signer secret availability:** Task 13 relies on custodial secrets being present for approving voters. This is only valid because keys are custodial in Phase 3–5; the Phase 6 Soroban migration replaces this entire disbursement path.
- **RLS interaction:** All server actions run with the user's Supabase session, so RLS policies from migration 0001 gate DB reads/writes correctly.
