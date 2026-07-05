# Phase 6 — Repayments, Interest Distribution, and Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the borrower repayment flow, backend interest distribution, and the group ledger page so a loan's full lifecycle — request → disburse → repay → interest paid out — is visible end-to-end in the demo.

**Architecture:** Repayments are custodial Stellar payments from the borrower's wallet to the group Stellar account, mirroring the contribution flow. When a repayment lands, a backend calculation splits the installment's interest portion equally across non-borrower members and inserts one `interest_distributions` row per share (no Soroban — hackathon-scoped). The ledger page reads the group account's Horizon payment history and cross-references tx hashes against `contributions`/`loans`/`repayments` to categorize each row.

**Tech Stack:** Next.js 16 App Router (RSC + Server Actions), Supabase (Postgres + RLS), Stellar SDK 12 (custodial signing + Horizon reads), Tailwind with the lingo-design token set, vitest.

## Global Constraints

- All UI follows the `lingo-design` skill (Forest & Gold): brand `#1A4731`, gold accent `#C9962A`, mint surface `#E8F5EE`, cream warm-bg `#F5F0E8`, 2px borders, 12px radius, buttons use `[box-shadow:0_4px_0_var(--shadow-brand)]` flat drop-shadow.
- Every Server Action returns `{ ok: true, ... } | { ok: false, error: string }` — never throws to the client.
- Custodial signing pattern: decrypt the actor's secret from `profiles.stellar_secret_encrypted` on the server, sign, submit to Horizon, never expose plaintext to the client.
- Interest distribution stays as a **backend calculation only** — `soroban_tx_hash` must become nullable; do not add a Soroban call.
- Each `submitRepayment` call must be idempotent-safe against double-submits: check `status = 'pending'` before the Stellar payment; refuse otherwise.
- Every page that reads Supabase auth cookies at render time must declare `export const dynamic = 'force-dynamic'` as the first line (see [[project_ambagan]] — `cacheComponents` has been removed).
- Money display uses `.toFixed(2)` with an `AMBPHP` suffix.
- All Horizon calls go through `horizonServer` in `lib/stellar.ts` (lazy env access).

---

## File Structure

**Create:**
- `supabase/migrations/0004_interest_distributions_optional_soroban.sql` — drop the NOT NULL on `interest_distributions.soroban_tx_hash`.
- `lib/interest-distribution.ts` — pure function that splits total interest across non-borrower members and returns the per-member shares with rounding remainders handled.
- `lib/interest-distribution.test.ts` — vitest unit tests.
- `app/(app)/groups/[groupId]/repayments/actions.ts` — `submitRepayment` server action (Stellar send + DB update + interest split + loan-status transition).
- `app/(app)/groups/[groupId]/repayments/repayment-row.tsx` — client component: renders one installment, mounts the Make Payment button on the next unpaid row.
- `app/(app)/groups/[groupId]/ledger/ledger-table.tsx` — client component: filter chips (all / contributions / loans / repayments).
- `components/group/interest-summary.tsx` — RSC: current user's total interest earned in this group.

**Modify:**
- `app/(app)/groups/[groupId]/repayments/page.tsx` — replace stub with borrower's repayment tracker.
- `app/(app)/groups/[groupId]/ledger/page.tsx` — replace stub with Horizon-backed ledger.
- `app/(app)/groups/[groupId]/page.tsx` — mount `<InterestSummary />` below the existing contribution card.

**No changes required to:** `lib/stellar.ts` (already exports `sendAMBPHP`, `getAccountPayments`, `decryptSecret`), `lib/loan-math.ts`, `app/(app)/groups/[groupId]/loans/*`.

---

## Interfaces (locked contracts across tasks)

```ts
// lib/interest-distribution.ts
export type InterestShare = { memberId: string; amount: number }

export function computeInterestShares(
  totalInterest: number,
  nonBorrowerMemberIds: string[],
): InterestShare[]

// app/(app)/groups/[groupId]/repayments/actions.ts
export async function submitRepayment(input: {
  groupId: string
  loanId: string
  repaymentId: string
}): Promise<
  | { ok: true; txHash: string; loanRepaid: boolean }
  | { ok: false; error: string }
>
```

---

## Task 1: Migration — allow backend-only interest distributions

**Files:**
- Create: `supabase/migrations/0004_interest_distributions_optional_soroban.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: `interest_distributions.soroban_tx_hash` is nullable so backend-calculated shares can be inserted without a Soroban tx hash.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_interest_distributions_optional_soroban.sql`:

```sql
-- Phase 6 scope adjustment: interest distribution is a backend calculation
-- for the hackathon (no Soroban). The soroban_tx_hash column stays for
-- post-hackathon on-chain payouts but must be optional.

alter table public.interest_distributions
  alter column soroban_tx_hash drop not null;
```

- [ ] **Step 2: Apply the migration**

Apply via Supabase SQL Editor (paste the file contents) or run `supabase db push` if the CLI is wired up. In the Supabase dashboard, confirm the column `interest_distributions.soroban_tx_hash` shows `Nullable: Yes`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0004_interest_distributions_optional_soroban.sql
git commit -m "feat(db): make interest_distributions.soroban_tx_hash nullable"
```

---

## Task 2: Interest distribution math (pure function + tests)

**Files:**
- Create: `lib/interest-distribution.ts`
- Test: `lib/interest-distribution.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `computeInterestShares(totalInterest, nonBorrowerMemberIds): InterestShare[]` — each share rounded to 2 decimals; the last member absorbs the rounding remainder so the sum of shares equals `totalInterest` rounded to 2 decimals. Returns `[]` if either input is empty/zero.

- [ ] **Step 1: Write the failing tests**

Create `lib/interest-distribution.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeInterestShares } from './interest-distribution'

describe('computeInterestShares', () => {
  it('splits interest equally when the amount divides cleanly', () => {
    const shares = computeInterestShares(30, ['a', 'b', 'c'])
    expect(shares).toEqual([
      { memberId: 'a', amount: 10 },
      { memberId: 'b', amount: 10 },
      { memberId: 'c', amount: 10 },
    ])
  })

  it('gives the rounding remainder to the last member', () => {
    const shares = computeInterestShares(10, ['a', 'b', 'c'])
    expect(shares[0].amount).toBe(3.33)
    expect(shares[1].amount).toBe(3.33)
    expect(shares[2].amount).toBe(3.34)
    const total = shares.reduce((acc, s) => acc + s.amount, 0)
    expect(Math.round(total * 100) / 100).toBe(10)
  })

  it('returns [] when there are no non-borrower members', () => {
    expect(computeInterestShares(50, [])).toEqual([])
  })

  it('returns [] when total interest is zero or negative', () => {
    expect(computeInterestShares(0, ['a', 'b'])).toEqual([])
    expect(computeInterestShares(-5, ['a', 'b'])).toEqual([])
  })

  it('handles a single non-borrower member', () => {
    expect(computeInterestShares(7.77, ['solo'])).toEqual([
      { memberId: 'solo', amount: 7.77 },
    ])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/interest-distribution.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `lib/interest-distribution.ts`:

```ts
export type InterestShare = { memberId: string; amount: number }

export function computeInterestShares(
  totalInterest: number,
  nonBorrowerMemberIds: string[],
): InterestShare[] {
  if (nonBorrowerMemberIds.length === 0 || totalInterest <= 0) return []

  const n = nonBorrowerMemberIds.length
  const per = round2(totalInterest / n)
  const shares: InterestShare[] = nonBorrowerMemberIds.map((memberId) => ({
    memberId,
    amount: per,
  }))

  const roundedTotal = round2(totalInterest)
  const currentSum = round2(per * n)
  const remainder = round2(roundedTotal - currentSum)
  if (remainder !== 0) {
    shares[shares.length - 1].amount = round2(
      shares[shares.length - 1].amount + remainder,
    )
  }
  return shares
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run lib/interest-distribution.test.ts`
Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/interest-distribution.ts lib/interest-distribution.test.ts
git commit -m "feat(loans): add interest-share splitter with rounding remainder"
```

---

## Task 3: Ledger page (Horizon-backed group ledger)

**Files:**
- Modify: `app/(app)/groups/[groupId]/ledger/page.tsx`
- Create: `app/(app)/groups/[groupId]/ledger/ledger-table.tsx`

**Interfaces:**
- Consumes: `horizonServer.payments()` via `getAccountPayments(publicKey, limit)`; tx-hash lookups against `contributions`, `loans`, `repayments` tables.
- Produces: a RSC-rendered table listing every AMBPHP payment on the group Stellar account with a type badge (`contribution` / `disbursement` / `repayment` / `other`), amount, direction (in / out), counterparty, timestamp, and stellar.expert link. Client-side filter chips let the user narrow by category.

- [ ] **Step 1: Replace the ledger page stub**

Replace `app/(app)/groups/[groupId]/ledger/page.tsx` entirely with:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAccountPayments } from '@/lib/stellar'
import { LedgerTable, type LedgerRow } from './ledger-table'

export default async function GroupLedgerPage({
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
    .select('id, name, stellar_account_id')
    .eq('id', groupId)
    .single()
  if (!group?.stellar_account_id) {
    return (
      <main className="mx-auto w-full max-w-4xl p-6 md:p-10">
        <h1 className="text-2xl font-bold text-heading">Ledger</h1>
        <p className="mt-4 text-sm text-body-subtle">
          Group Stellar account not provisioned yet.
        </p>
      </main>
    )
  }

  const payments = await getAccountPayments(group.stellar_account_id, 50)
  const groupAccount = group.stellar_account_id

  const ambphpPayments = payments.filter(
    (p: any) =>
      p.type === 'payment' &&
      p.asset_type !== 'native' &&
      p.asset_code === 'AMBPHP',
  )
  const txHashes = ambphpPayments.map((p: any) => p.transaction_hash)

  const [contribHits, loanHits, repayHits] = await Promise.all([
    supabase
      .from('contributions')
      .select('stellar_tx_hash, user_id, profiles:user_id(full_name)')
      .in('stellar_tx_hash', txHashes.length ? txHashes : ['__none__']),
    supabase
      .from('loans')
      .select('stellar_tx_hash, borrower_id, profiles:borrower_id(full_name)')
      .in('stellar_tx_hash', txHashes.length ? txHashes : ['__none__']),
    supabase
      .from('repayments')
      .select('stellar_tx_hash, loan_id, loans:loan_id(borrower_id, profiles:borrower_id(full_name))')
      .in('stellar_tx_hash', txHashes.length ? txHashes : ['__none__']),
  ])

  const byHash = new Map<string, { type: LedgerRow['type']; counterpartyName?: string }>()
  for (const c of contribHits.data ?? []) {
    byHash.set(c.stellar_tx_hash as string, {
      type: 'contribution',
      counterpartyName: (c as any).profiles?.full_name,
    })
  }
  for (const l of loanHits.data ?? []) {
    byHash.set(l.stellar_tx_hash as string, {
      type: 'disbursement',
      counterpartyName: (l as any).profiles?.full_name,
    })
  }
  for (const r of repayHits.data ?? []) {
    byHash.set(r.stellar_tx_hash as string, {
      type: 'repayment',
      counterpartyName: (r as any).loans?.profiles?.full_name,
    })
  }

  const rows: LedgerRow[] = ambphpPayments.map((p: any) => {
    const category = byHash.get(p.transaction_hash) ?? { type: 'other' as const }
    const direction = p.to === groupAccount ? 'in' : 'out'
    return {
      id: p.id,
      txHash: p.transaction_hash,
      amount: Number(p.amount),
      direction,
      type: category.type,
      counterpartyName: category.counterpartyName,
      counterpartyAccount: direction === 'in' ? p.from : p.to,
      createdAt: p.created_at,
    }
  })

  return (
    <main className="mx-auto w-full max-w-4xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Ledger</h1>
        <p className="text-sm text-body-subtle">
          Every AMBPHP movement on the group account, straight from Stellar.
        </p>
      </div>
      <LedgerTable rows={rows} />
    </main>
  )
}
```

- [ ] **Step 2: Build the client table**

Create `app/(app)/groups/[groupId]/ledger/ledger-table.tsx`:

```tsx
'use client'

import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ExternalLink } from 'lucide-react'

export type LedgerRow = {
  id: string
  txHash: string
  amount: number
  direction: 'in' | 'out'
  type: 'contribution' | 'disbursement' | 'repayment' | 'other'
  counterpartyName?: string
  counterpartyAccount: string
  createdAt: string
}

const TYPE_LABEL: Record<LedgerRow['type'], string> = {
  contribution: 'Contribution',
  disbursement: 'Disbursement',
  repayment: 'Repayment',
  other: 'Other',
}

const TYPE_CLS: Record<LedgerRow['type'], string> = {
  contribution: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
  disbursement: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  repayment: 'border-[#3B8FB5] bg-[#EBF5FA] text-[#3B8FB5]',
  other: 'border-border-default bg-warm-bg text-body-subtle',
}

const FILTERS: Array<{ value: 'all' | LedgerRow['type']; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'contribution', label: 'Contributions' },
  { value: 'disbursement', label: 'Disbursements' },
  { value: 'repayment', label: 'Repayments' },
]

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  const [filter, setFilter] = useState<'all' | LedgerRow['type']>('all')

  const filtered = useMemo(
    () => (filter === 'all' ? rows : rows.filter((r) => r.type === filter)),
    [rows, filter],
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={[
              'rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all',
              filter === f.value
                ? 'border-border-brand-subtle bg-surface text-fg-brand-strong [box-shadow:0_3px_0_rgba(0,0,0,0.12)]'
                : 'border-border-default bg-neutral-primary text-body-subtle hover:border-border-default-strong',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">
            No entries yet.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                      r.direction === 'in'
                        ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
                        : 'border-border-warning-subtle bg-warning-soft text-fg-warning'
                    }`}
                  >
                    {r.direction === 'in' ? (
                      <ArrowDownLeft className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-heading">
                      {r.counterpartyName ??
                        `${r.counterpartyAccount.slice(0, 6)}…${r.counterpartyAccount.slice(-4)}`}
                    </p>
                    <p className="text-xs text-body-subtle">
                      {new Date(r.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${TYPE_CLS[r.type]}`}
                  >
                    {TYPE_LABEL[r.type]}
                  </span>
                  <span className="font-bold text-heading">
                    {r.direction === 'in' ? '+' : '−'}
                    {r.amount.toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-body-subtle">AMBPHP</span>
                  </span>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${r.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand-strong hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    tx
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Manually verify**

Start the dev server (`pnpm dev`), navigate to `/groups/<a real group id>/ledger` for a group that has already run through a contribution and a disbursement in the Phase 3–5 build. Confirm each row shows the correct badge and clicking the `tx` link opens stellar.expert.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/groups/\[groupId\]/ledger/page.tsx app/\(app\)/groups/\[groupId\]/ledger/ledger-table.tsx
git commit -m "feat(ledger): show Horizon-backed group ledger with type filters"
```

---

## Task 4: Repayments page (borrower's installment tracker)

**Files:**
- Modify: `app/(app)/groups/[groupId]/repayments/page.tsx`
- Create: `app/(app)/groups/[groupId]/repayments/repayment-row.tsx`

**Interfaces:**
- Consumes: `loans` (borrower_id, status), `repayments` (loan_id, installment_number, amount_due, principal, interest, due_date, paid_at, stellar_tx_hash, status).
- Produces: a page listing each disbursed/repaid loan the current user borrowed, with all installments beneath. `<RepaymentRow />` renders the Make Payment button only on the next `pending` installment (the one with the lowest `installment_number` where `status = 'pending'`) of a `disbursed` loan.

- [ ] **Step 1: Replace the repayments page stub**

Replace `app/(app)/groups/[groupId]/repayments/page.tsx` entirely with:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { RepaymentRow, type RepaymentRowData } from './repayment-row'

export default async function RepaymentsPage({
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
    .select('id, amount, status, purpose_tag, description, disbursed_at')
    .eq('group_id', groupId)
    .eq('borrower_id', user.id)
    .in('status', ['disbursed', 'repaid'])
    .order('disbursed_at', { ascending: false })

  const loanIds = (loans ?? []).map((l) => l.id)

  const { data: repayments } = loanIds.length
    ? await supabase
        .from('repayments')
        .select('id, loan_id, installment_number, amount_due, principal, interest, due_date, paid_at, stellar_tx_hash, status')
        .in('loan_id', loanIds)
        .order('installment_number', { ascending: true })
    : { data: [] as any[] }

  const byLoan = new Map<string, any[]>()
  for (const r of repayments ?? []) {
    const arr = byLoan.get(r.loan_id!) ?? []
    arr.push(r)
    byLoan.set(r.loan_id!, arr)
  }

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Repayments</h1>
        <p className="text-sm text-body-subtle">
          Your installments across every loan you've taken from this group.
        </p>
      </div>

      {(!loans || loans.length === 0) && (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">No active loans.</p>
        </div>
      )}

      <ul className="flex flex-col gap-6">
        {(loans ?? []).map((loan) => {
          const installments = byLoan.get(loan.id) ?? []
          const paidCount = installments.filter((i) => i.status === 'paid').length
          const nextPendingId = installments.find((i) => i.status === 'pending')?.id
          const progressPct =
            installments.length > 0
              ? Math.round((paidCount / installments.length) * 100)
              : 0

          return (
            <li
              key={loan.id}
              className="rounded-xl border-2 border-border-default bg-neutral-primary shadow-xs"
            >
              <div className="border-b-2 border-border-default px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-heading">
                      {loan.amount}{' '}
                      <span className="text-base font-semibold">AMBPHP</span>
                    </p>
                    {loan.description && (
                      <p className="mt-1 text-sm text-body">{loan.description}</p>
                    )}
                  </div>
                  <span
                    className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                      loan.status === 'repaid'
                        ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
                        : 'border-border-warning-subtle bg-warning-soft text-fg-warning'
                    }`}
                  >
                    {loan.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-body-subtle">
                    <span>
                      {paidCount} of {installments.length} paid
                    </span>
                    <span>{progressPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-warm-bg">
                    <div
                      className="h-full rounded-full bg-brand transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <ul className="divide-y-2 divide-border-default">
                {installments.map((inst) => {
                  const data: RepaymentRowData = {
                    id: inst.id,
                    loanId: loan.id,
                    installmentNumber: inst.installment_number,
                    amountDue: Number(inst.amount_due),
                    principal: Number(inst.principal),
                    interest: Number(inst.interest),
                    dueDate: inst.due_date,
                    paidAt: inst.paid_at,
                    stellarTxHash: inst.stellar_tx_hash,
                    status: inst.status,
                  }
                  return (
                    <RepaymentRow
                      key={inst.id}
                      row={data}
                      groupId={groupId}
                      isNextPending={inst.id === nextPendingId && loan.status === 'disbursed'}
                    />
                  )
                })}
              </ul>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
```

- [ ] **Step 2: Build the RepaymentRow client component (button wired in Task 5)**

Create `app/(app)/groups/[groupId]/repayments/repayment-row.tsx` with a stubbed button — we'll wire the action in Task 5:

```tsx
'use client'

import { CheckCircle2, Clock, ExternalLink } from 'lucide-react'

export type RepaymentRowData = {
  id: string
  loanId: string
  installmentNumber: number
  amountDue: number
  principal: number
  interest: number
  dueDate: string
  paidAt: string | null
  stellarTxHash: string | null
  status: 'pending' | 'paid' | 'late' | 'missed'
}

const STATUS_CLS: Record<RepaymentRowData['status'], string> = {
  paid: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
  pending: 'border-border-default bg-warm-bg text-body-subtle',
  late: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  missed: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
}

export function RepaymentRow({
  row,
  groupId,
  isNextPending,
}: {
  row: RepaymentRowData
  groupId: string
  isNextPending: boolean
}) {
  return (
    <li className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex items-center gap-3">
        {row.status === 'paid' ? (
          <CheckCircle2 className="h-5 w-5 text-fg-brand-strong" />
        ) : (
          <Clock className="h-5 w-5 text-body-subtle" />
        )}
        <div>
          <p className="text-sm font-semibold text-heading">
            Month {row.installmentNumber}
          </p>
          <p className="text-xs text-body-subtle">
            Due {new Date(row.dueDate).toLocaleDateString()} · P {row.principal.toFixed(2)} + I{' '}
            {row.interest.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-heading">
          {row.amountDue.toFixed(2)}{' '}
          <span className="text-xs font-semibold text-body-subtle">AMBPHP</span>
        </span>
        <span
          className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLS[row.status]}`}
        >
          {row.status}
        </span>
        {row.status === 'paid' && row.stellarTxHash && (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${row.stellarTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand-strong hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            tx
          </a>
        )}
        {isNextPending && (
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-transparent bg-disabled px-4 py-2 text-xs font-bold uppercase tracking-wide text-fg-disabled"
          >
            Make Payment
          </button>
        )}
      </div>
      {/* void groupId lint for now — wired in Task 5 */}
      <span hidden data-group={groupId} />
    </li>
  )
}
```

- [ ] **Step 3: Manually verify**

`pnpm dev`; log in as a borrower who has a disbursed loan; visit `/groups/<groupId>/repayments`. Confirm every installment is shown, only the first pending row shows the (disabled) Make Payment button, and paid rows have a stellar.expert tx link.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/groups/\[groupId\]/repayments/page.tsx app/\(app\)/groups/\[groupId\]/repayments/repayment-row.tsx
git commit -m "feat(repayments): render borrower installment tracker (button stubbed)"
```

---

## Task 5: `submitRepayment` server action + Make Payment button

**Files:**
- Create: `app/(app)/groups/[groupId]/repayments/actions.ts`
- Modify: `app/(app)/groups/[groupId]/repayments/repayment-row.tsx`

**Interfaces:**
- Consumes: `sendAMBPHP`, `decryptSecret` from `lib/stellar.ts`; `computeInterestShares` from `lib/interest-distribution.ts`.
- Produces: `submitRepayment({ groupId, loanId, repaymentId })` — validates the caller is the loan's borrower, confirms the repayment is still `pending`, sends `amount_due` AMBPHP from borrower → group account, marks the row `paid` with the tx hash and `paid_at`, inserts one `interest_distributions` row per non-borrower member for the row's `interest` portion, and if this was the last pending installment updates the loan to `status = 'repaid'`. Returns `{ loanRepaid: boolean }` so the UI can react.

- [ ] **Step 1: Write the server action**

Create `app/(app)/groups/[groupId]/repayments/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, sendAMBPHP } from '@/lib/stellar'
import { computeInterestShares } from '@/lib/interest-distribution'

export async function submitRepayment(input: {
  groupId: string
  loanId: string
  repaymentId: string
}): Promise<
  | { ok: true; txHash: string; loanRepaid: boolean }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: loan } = await supabase
    .from('loans')
    .select('id, borrower_id, group_id, status')
    .eq('id', input.loanId)
    .single()
  if (!loan) return { ok: false, error: 'Loan not found' }
  if (loan.borrower_id !== user.id) return { ok: false, error: 'Only the borrower can repay' }
  if (loan.group_id !== input.groupId) return { ok: false, error: 'Loan does not belong to this group' }
  if (loan.status !== 'disbursed') return { ok: false, error: `Loan status is ${loan.status}, cannot repay` }

  const { data: repayment } = await supabase
    .from('repayments')
    .select('id, loan_id, amount_due, interest, status, installment_number')
    .eq('id', input.repaymentId)
    .single()
  if (!repayment) return { ok: false, error: 'Installment not found' }
  if (repayment.loan_id !== input.loanId) return { ok: false, error: 'Installment does not belong to this loan' }
  if (repayment.status !== 'pending') return { ok: false, error: 'Installment already paid' }

  const { data: group } = await supabase
    .from('groups')
    .select('stellar_account_id')
    .eq('id', input.groupId)
    .single()
  if (!group?.stellar_account_id) return { ok: false, error: 'Group Stellar account not provisioned' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_secret_encrypted) return { ok: false, error: 'Borrower wallet not provisioned' }

  let txHash: string
  try {
    const secret = decryptSecret(profile.stellar_secret_encrypted)
    const result = await sendAMBPHP(
      secret,
      group.stellar_account_id,
      String(repayment.amount_due),
    )
    txHash = result.hash
  } catch (err) {
    return { ok: false, error: `Stellar payment failed: ${(err as Error).message}` }
  }

  const { error: updErr } = await supabase
    .from('repayments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      stellar_tx_hash: txHash,
    })
    .eq('id', input.repaymentId)
    .eq('status', 'pending')
  if (updErr) return { ok: false, error: `Failed to record payment: ${updErr.message}` }

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', input.groupId)
  const nonBorrowerIds = (members ?? [])
    .map((m) => m.user_id)
    .filter((id): id is string => Boolean(id) && id !== user.id)

  const shares = computeInterestShares(Number(repayment.interest), nonBorrowerIds)
  if (shares.length > 0) {
    await supabase.from('interest_distributions').insert(
      shares.map((s) => ({
        loan_id: input.loanId,
        member_id: s.memberId,
        amount: s.amount,
      })),
    )
    for (const s of shares) {
      const { data: gm } = await supabase
        .from('group_members')
        .select('id, total_interest_earned')
        .eq('group_id', input.groupId)
        .eq('user_id', s.memberId)
        .single()
      if (gm) {
        await supabase
          .from('group_members')
          .update({
            total_interest_earned: Number(gm.total_interest_earned ?? 0) + s.amount,
          })
          .eq('id', gm.id)
      }
    }
  }

  const { count: pendingLeft } = await supabase
    .from('repayments')
    .select('id', { count: 'exact', head: true })
    .eq('loan_id', input.loanId)
    .eq('status', 'pending')

  let loanRepaid = false
  if ((pendingLeft ?? 0) === 0) {
    await supabase.from('loans').update({ status: 'repaid' }).eq('id', input.loanId)
    loanRepaid = true
  }

  revalidatePath(`/groups/${input.groupId}/repayments`)
  revalidatePath(`/groups/${input.groupId}/ledger`)
  revalidatePath(`/groups/${input.groupId}`)
  return { ok: true, txHash, loanRepaid }
}
```

- [ ] **Step 2: Wire the button into RepaymentRow**

Replace `app/(app)/groups/[groupId]/repayments/repayment-row.tsx` entirely with:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Clock, ExternalLink, Loader2 } from 'lucide-react'
import { submitRepayment } from './actions'

export type RepaymentRowData = {
  id: string
  loanId: string
  installmentNumber: number
  amountDue: number
  principal: number
  interest: number
  dueDate: string
  paidAt: string | null
  stellarTxHash: string | null
  status: 'pending' | 'paid' | 'late' | 'missed'
}

const STATUS_CLS: Record<RepaymentRowData['status'], string> = {
  paid: 'border-border-brand-subtle bg-surface text-fg-brand-strong',
  pending: 'border-border-default bg-warm-bg text-body-subtle',
  late: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  missed: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
}

export function RepaymentRow({
  row,
  groupId,
  isNextPending,
}: {
  row: RepaymentRowData
  groupId: string
  isNextPending: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onPay() {
    setError(null)
    startTransition(async () => {
      const result = await submitRepayment({
        groupId,
        loanId: row.loanId,
        repaymentId: row.id,
      })
      if (!result.ok) setError(result.error)
    })
  }

  return (
    <li className="flex flex-col gap-2 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {row.status === 'paid' ? (
            <CheckCircle2 className="h-5 w-5 text-fg-brand-strong" />
          ) : (
            <Clock className="h-5 w-5 text-body-subtle" />
          )}
          <div>
            <p className="text-sm font-semibold text-heading">
              Month {row.installmentNumber}
            </p>
            <p className="text-xs text-body-subtle">
              Due {new Date(row.dueDate).toLocaleDateString()} · P{' '}
              {row.principal.toFixed(2)} + I {row.interest.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-heading">
            {row.amountDue.toFixed(2)}{' '}
            <span className="text-xs font-semibold text-body-subtle">AMBPHP</span>
          </span>
          <span
            className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${STATUS_CLS[row.status]}`}
          >
            {row.status}
          </span>
          {row.status === 'paid' && row.stellarTxHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${row.stellarTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand-strong hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              tx
            </a>
          )}
          {isNextPending && (
            <button
              type="button"
              onClick={onPay}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 border-transparent bg-brand px-4 py-2 text-xs font-bold uppercase tracking-wide text-white transition-all [box-shadow:0_3px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_1px_0_var(--shadow-brand)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-fg-disabled disabled:shadow-none"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {pending ? 'Paying…' : 'Make Payment'}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-danger-strong">{error}</p>
      )}
    </li>
  )
}
```

- [ ] **Step 3: End-to-end verify**

`pnpm dev`. Log in as a borrower with a disbursed loan. From `/groups/<groupId>/repayments`, click Make Payment on the first pending installment. Expect:
- Button shows spinner + "Paying…", then the page re-renders with that row now `paid`, showing a stellar.expert tx link.
- `/groups/<groupId>/ledger` shows a new `Repayment` row (direction `in`).
- Log in as a non-borrower member of the group — the group overview should reflect updated interest earnings after Task 6.

Trigger the "loan fully repaid" path by paying every installment; confirm the loan card on `/groups/<groupId>/loans` flips to `repaid` (its Realtime subscription picks up the loans-table UPDATE).

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/groups/\[groupId\]/repayments/actions.ts app/\(app\)/groups/\[groupId\]/repayments/repayment-row.tsx
git commit -m "feat(repayments): submit repayments on-chain and distribute interest"
```

---

## Task 6: Interest earnings summary on the group page

**Files:**
- Create: `components/group/interest-summary.tsx`
- Modify: `app/(app)/groups/[groupId]/page.tsx`

**Interfaces:**
- Consumes: `interest_distributions` (loan_id, member_id, amount) joined against `loans` filtered to `group_id`; the current user id.
- Produces: a card showing the current user's total interest earned across all loans in this group, plus a small list of recent contributions (one line per source loan).

- [ ] **Step 1: Build the summary component**

Create `components/group/interest-summary.tsx`:

```tsx
import { createClient } from '@/utils/supabase/server'
import { TrendingUp } from 'lucide-react'

export async function InterestSummary({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('interest_distributions')
    .select('amount, loan_id, created_at, loans:loan_id(group_id, description)')
    .eq('member_id', userId)
    .order('created_at', { ascending: false })

  const scoped = (rows ?? []).filter(
    (r: any) => r.loans?.group_id === groupId,
  )
  const total = scoped.reduce((acc: number, r: any) => acc + Number(r.amount), 0)

  return (
    <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
          <TrendingUp className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">
            Interest earned in this group
          </p>
          <p className="text-2xl font-bold text-heading">
            {total.toFixed(2)}{' '}
            <span className="text-base font-semibold">AMBPHP</span>
          </p>
        </div>
      </div>

      {scoped.length > 0 && (
        <ul className="mt-4 divide-y-2 divide-border-default border-t-2 border-border-default">
          {scoped.slice(0, 5).map((r: any, i: number) => (
            <li
              key={`${r.loan_id}-${i}`}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="truncate text-body-subtle">
                {r.loans?.description ?? 'Loan repayment'}
              </span>
              <span className="font-semibold text-heading">
                +{Number(r.amount).toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 2: Mount it on the group overview**

In `app/(app)/groups/[groupId]/page.tsx`, add the import at the top with the other `components/group/*` imports:

```tsx
import { InterestSummary } from '@/components/group/interest-summary'
```

Then render `<InterestSummary groupId={groupId} userId={user.id} />` directly below the existing `<ContributionStatus />` block. Keep the existing spacing/gap classes on the parent — the summary card already includes its own padding/border.

- [ ] **Step 3: Manually verify**

`pnpm dev`. Log in as a **non-borrower** member of a group where at least one repayment has been made (from Task 5's verify). Visit the group overview and confirm:
- Total displayed matches sum of `interest_distributions` rows for that user in that group.
- Each recent row shows the source loan's description.

Log in as the borrower — total should be 0 for that group.

- [ ] **Step 4: Commit**

```bash
git add components/group/interest-summary.tsx app/\(app\)/groups/\[groupId\]/page.tsx
git commit -m "feat(profile): show per-group interest earnings on group overview"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Repayment tracker with Make Payment button → Task 4 (page + row) + Task 5 (button wiring).
  - Repayment submission with Stellar tx + status update → Task 5 (`submitRepayment`).
  - Interest distribution as backend calculation with `interest_distributions` rows → Task 2 (math) + Task 5 (insert).
  - Ledger reflects repayments → Task 3 (categorizes by tx hash lookup).
  - Each other member sees their share of the interest in their profile → Task 6 (per-group summary on the group overview, since no dedicated `/profile` route exists yet).
  - Soroban skeleton stays in `contracts/`: nothing in this plan touches it.
- **Type consistency:**
  - `computeInterestShares` signature is identical between the interface block, Task 2 test, Task 2 implementation, and Task 5 consumer.
  - `submitRepayment` return type (`{ ok: true; txHash: string; loanRepaid: boolean } | { ok: false; error: string }`) is identical between the interface block, Task 5 action, and Task 5 RepaymentRow caller (which only reads `.ok` / `.error`).
  - `RepaymentRowData` is exported from Task 4's component and consumed from Task 4's page shape.
- **Placeholder scan:** no TODOs, no "similar to task N", no unnamed helper functions. Every code step ships runnable code.
- **Deviations from spec are honored:** interest distribution is backend-only (§7.4 deviation); default handling is not touched (§8 deviation).
