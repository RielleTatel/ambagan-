# Ambagan Ownership Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incorrect "distribute interest per repayment to non-borrowers" model with the correct Contribution & Ownership model: required + optional contributions build ownership, loan interest grows the shared fund, and at cycle end the entire fund is distributed proportional to each member's ownership.

**Architecture:** Off-chain state moves to a single source: `contributions` (typed as `required` or `optional`). Ownership is a derived quantity, computed on read. The group Stellar account is authoritative for the fund balance. A one-shot admin action closes the cycle: reads the on-chain balance, computes payouts by ownership %, submits a single Stellar transaction with one payment operation per member, and records each payout row in a new `cycle_distributions` table.

**Tech Stack:** Next.js App Router + server actions, Supabase (Postgres + RLS), Stellar SDK (custodial signing, group master key threshold = 1), Vitest, Tailwind with the Ambagan design tokens.

## Global Constraints

- Test framework: `vitest`; tests colocated with source (e.g. `lib/foo.ts` + `lib/foo.test.ts`). Run with `npm test`.
- Migrations: numbered SQL files in `supabase/migrations/`. Apply via Supabase SQL editor or `supabase db push`.
- Server actions: file starts with `'use server'`; use `createClient()` from `@/utils/supabase/server`; return `{ ok: true, ... } | { ok: false, error: string }` on user-facing actions.
- All Stellar SDK calls live in `lib/stellar.ts` — no imports of `@stellar/stellar-sdk` outside that file.
- Money math: currency amounts rounded to 2 decimals; use the `round2` idiom (`Math.round(n * 100) / 100`).
- Design system (see `lingo-design`): 2px borders, `rounded-xl` (12px radius), tactile buttons with 4px flat shadow (`[box-shadow:0_4px_0_var(--shadow-brand)]`), forest green primary, mint surfaces on cream page background. Do not introduce new colors.
- The `contributions` table stores BOTH required contributions and optional investments, distinguished by `contribution_type`. There is no separate `investments` table.
- Ownership formula: `member_total_contributions / group_total_contributions`. It is always recomputed from `contributions` — never cached in a column.
- Cycle end is destructive to the fund on-chain (money leaves the group account). Only the group admin can trigger it, and the group's `cycle_status` locks to `closed` so no more required contributions or investments land in it.

---

## File Structure

### Create

- `supabase/migrations/0006_ownership_model.sql` — schema shift: `contribution_type`, cycle fields on groups, new `cycle_distributions` table, drop `interest_distributions`, drop `total_interest_earned`
- `lib/ownership.ts` — `computeOwnership()` pure function
- `lib/ownership.test.ts` — vitest suite
- `lib/cycle-distribution.ts` — `computeCyclePayouts()` pure function
- `lib/cycle-distribution.test.ts` — vitest suite
- `components/group/invest-button.tsx` — client component: input + submit optional investment
- `components/group/ownership-summary.tsx` — RSC replacing InterestSummary
- `components/group/cycle-distribution-history.tsx` — RSC showing past cycle payouts to the user
- `app/(app)/groups/[groupId]/admin/cycle/page.tsx` — admin RSC: preview payouts + button
- `app/(app)/groups/[groupId]/admin/cycle/end-cycle-form.tsx` — client component: confirm + call action
- `app/(app)/groups/[groupId]/admin/cycle/actions.ts` — `endCycleAndDistribute()` server action

### Modify

- `app/(app)/groups/[groupId]/actions.ts` — set `contribution_type: 'required'` explicitly; add `submitInvestment()` action
- `app/(app)/groups/[groupId]/repayments/actions.ts` — remove per-repayment interest attribution block (lines 78–111)
- `app/(app)/groups/[groupId]/page.tsx` — swap `<InterestSummary>` for `<OwnershipSummary>` and `<CycleDistributionHistory>`; add `<InvestButton>`
- `lib/stellar.ts` — add `distributePot()` helper
- `lib/credit-inputs.ts` — filter `contributions` by `contribution_type='required'`

### Delete

- `lib/interest-distribution.ts`
- `lib/interest-distribution.test.ts`
- `components/group/interest-summary.tsx`

---

## Task 1: Schema migration — ownership model

**Files:**
- Create: `supabase/migrations/0006_ownership_model.sql`

**Interfaces:**
- Consumes: existing tables `contributions`, `groups`, `group_members`, `interest_distributions`
- Produces: `contributions.contribution_type` ('required' | 'optional'); `groups.current_cycle_number`, `groups.cycle_status`; new `cycle_distributions` table; `interest_distributions` and `group_members.total_interest_earned` are gone

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0006_ownership_model.sql`:

```sql
-- Ownership model refactor.
-- Drops the wrong per-repayment interest attribution (interest_distributions,
-- total_interest_earned) and introduces contribution typing (required vs
-- optional) plus the cycle_distributions table for end-of-cycle payouts.

-- ---------------------------------------------------------------------------
-- 1. Contribution typing
-- ---------------------------------------------------------------------------

alter table public.contributions
  add column contribution_type text not null default 'required'
  check (contribution_type in ('required', 'optional'));

-- Optional investments are not tied to a cycle and have no due date.
alter table public.contributions
  alter column cycle_number drop not null,
  alter column due_date drop not null;

-- ---------------------------------------------------------------------------
-- 2. Cycle state on groups
-- ---------------------------------------------------------------------------

alter table public.groups
  add column current_cycle_number integer not null default 1,
  add column cycle_status text not null default 'active'
    check (cycle_status in ('active', 'closed'));

-- ---------------------------------------------------------------------------
-- 3. Cycle distributions
-- ---------------------------------------------------------------------------

create table public.cycle_distributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  cycle_number integer not null,
  member_id uuid references public.profiles(id) not null,
  total_contributed numeric not null,
  ownership_pct numeric not null,
  payout_amount numeric not null,
  stellar_tx_hash text,
  created_at timestamptz default now(),
  unique(group_id, cycle_number, member_id)
);

alter table public.cycle_distributions enable row level security;

create policy "Cycle distributions visible to group members"
  on public.cycle_distributions for select using (
    exists (
      select 1 from public.group_members
      where group_id = cycle_distributions.group_id and user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Remove the wrong per-repayment interest attribution
-- ---------------------------------------------------------------------------

drop table if exists public.interest_distributions cascade;

alter table public.group_members
  drop column if exists total_interest_earned;
```

- [ ] **Step 2: Apply the migration**

Run in the Supabase SQL editor (paste the file contents) OR via CLI:

```bash
supabase db push
```

Expected: no error; new columns and table visible in the schema browser.

- [ ] **Step 3: Verify schema**

In the Supabase SQL editor:

```sql
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'contributions'
  and column_name in ('contribution_type', 'cycle_number', 'due_date');
```

Expected: `contribution_type` (text, NO), `cycle_number` (integer, YES), `due_date` (date, YES).

```sql
select column_name from information_schema.columns
where table_name = 'group_members' and column_name = 'total_interest_earned';
```

Expected: 0 rows.

```sql
select tablename from pg_tables where tablename = 'cycle_distributions';
```

Expected: `cycle_distributions`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_ownership_model.sql
git commit -m "feat(schema): ownership model — contribution_type, cycle_distributions"
```

---

## Task 2: Rip out per-repayment interest distribution

**Files:**
- Delete: `lib/interest-distribution.ts`
- Delete: `lib/interest-distribution.test.ts`
- Delete: `components/group/interest-summary.tsx`
- Modify: `app/(app)/groups/[groupId]/repayments/actions.ts` (remove lines 78–111)
- Modify: `app/(app)/groups/[groupId]/page.tsx` (remove `InterestSummary` import + usage)

**Interfaces:**
- Consumes: nothing new
- Produces: repayment action now only sends AMBPHP + updates the repayment row; no more premature interest attribution

- [ ] **Step 1: Write a failing test that proves the wrong behavior is gone**

Create `app/(app)/groups/[groupId]/repayments/actions.test.ts` — actually skip this; the action does I/O we cannot easily unit-test. Instead we verify by build + eyeball.

Skip to Step 2.

- [ ] **Step 2: Delete the interest-distribution library and its test**

```bash
rm lib/interest-distribution.ts lib/interest-distribution.test.ts
```

- [ ] **Step 3: Delete the interest-summary component**

```bash
rm components/group/interest-summary.tsx
```

- [ ] **Step 4: Rewrite `repayments/actions.ts` without the distribution block**

Replace `app/(app)/groups/[groupId]/repayments/actions.ts` with:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, sendAMBPHP } from '@/lib/stellar'
import { recomputeCreditScore } from '@/lib/credit-inputs'

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
    .select('id, loan_id, amount_due, status, installment_number')
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
  await recomputeCreditScore(user.id).catch(() => undefined)
  return { ok: true, txHash, loanRepaid }
}
```

- [ ] **Step 5: Remove InterestSummary from group overview**

Edit `app/(app)/groups/[groupId]/page.tsx` — remove the `import { InterestSummary }` line at the top and the `<InterestSummary groupId={group.id} userId={user.id} />` line inside the CardContent. Leave a placeholder — Task 6 will fill it with `<OwnershipSummary>`.

Concretely: delete these two lines:

```tsx
import { InterestSummary } from '@/components/group/interest-summary'
```

and inside CardContent:

```tsx
<InterestSummary groupId={group.id} userId={user.id} />
```

- [ ] **Step 6: Verify build + tests pass**

Run:

```bash
npm run build
npm test
```

Expected: both succeed. Any test that imports `interest-distribution` should have been deleted in Step 2, so no test failures related to it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor(interest): remove per-repayment attribution (wrong model)"
```

---

## Task 3: Ownership calculator

**Files:**
- Create: `lib/ownership.ts`
- Create: `lib/ownership.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `type MemberContribution = { userId: string; totalContributed: number }`
  - `type OwnershipRow = { userId: string; totalContributed: number; ownershipPct: number }`
  - `function computeOwnership(members: MemberContribution[]): OwnershipRow[]` — `ownershipPct` is a number in `[0, 100]`, rounded to 2 decimals; input order is preserved

- [ ] **Step 1: Write the failing test**

Create `lib/ownership.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeOwnership } from './ownership'

describe('computeOwnership', () => {
  it('computes equal shares when contributions are equal', () => {
    const rows = computeOwnership([
      { userId: 'a', totalContributed: 100 },
      { userId: 'b', totalContributed: 100 },
    ])
    expect(rows).toEqual([
      { userId: 'a', totalContributed: 100, ownershipPct: 50 },
      { userId: 'b', totalContributed: 100, ownershipPct: 50 },
    ])
  })

  it('matches the spec example (Juan/Maria/Ana/Carl)', () => {
    const rows = computeOwnership([
      { userId: 'juan', totalContributed: 15000 },
      { userId: 'maria', totalContributed: 12000 },
      { userId: 'ana', totalContributed: 17000 },
      { userId: 'carl', totalContributed: 12000 },
    ])
    const pctByUser = Object.fromEntries(rows.map((r) => [r.userId, r.ownershipPct]))
    expect(pctByUser.juan).toBeCloseTo(26.79, 2)
    expect(pctByUser.maria).toBeCloseTo(21.43, 2)
    expect(pctByUser.ana).toBeCloseTo(30.36, 2)
    expect(pctByUser.carl).toBeCloseTo(21.43, 2)
  })

  it('returns 0% for everyone when total contributions are 0', () => {
    const rows = computeOwnership([
      { userId: 'a', totalContributed: 0 },
      { userId: 'b', totalContributed: 0 },
    ])
    expect(rows.every((r) => r.ownershipPct === 0)).toBe(true)
  })

  it('returns 100% for a lone contributor', () => {
    const rows = computeOwnership([{ userId: 'solo', totalContributed: 500 }])
    expect(rows[0].ownershipPct).toBe(100)
  })

  it('returns [] for empty input', () => {
    expect(computeOwnership([])).toEqual([])
  })

  it('preserves input order', () => {
    const rows = computeOwnership([
      { userId: 'z', totalContributed: 50 },
      { userId: 'a', totalContributed: 50 },
    ])
    expect(rows.map((r) => r.userId)).toEqual(['z', 'a'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm test -- lib/ownership.test.ts
```

Expected: FAIL with "Cannot find module './ownership'".

- [ ] **Step 3: Implement `computeOwnership`**

Create `lib/ownership.ts`:

```ts
export type MemberContribution = {
  userId: string
  totalContributed: number
}

export type OwnershipRow = {
  userId: string
  totalContributed: number
  ownershipPct: number
}

export function computeOwnership(
  members: MemberContribution[],
): OwnershipRow[] {
  const total = members.reduce((acc, m) => acc + m.totalContributed, 0)
  if (total <= 0) {
    return members.map((m) => ({
      userId: m.userId,
      totalContributed: m.totalContributed,
      ownershipPct: 0,
    }))
  }
  return members.map((m) => ({
    userId: m.userId,
    totalContributed: m.totalContributed,
    ownershipPct: round2((m.totalContributed / total) * 100),
  }))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- lib/ownership.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/ownership.ts lib/ownership.test.ts
git commit -m "feat(ownership): pure calculator for member ownership %"
```

---

## Task 4: Cycle payout calculator

**Files:**
- Create: `lib/cycle-distribution.ts`
- Create: `lib/cycle-distribution.test.ts`

**Interfaces:**
- Consumes: `OwnershipRow` from `lib/ownership.ts`
- Produces:
  - `type PayoutRow = { userId: string; amount: number }`
  - `function computeCyclePayouts(totalFund: number, ownership: OwnershipRow[]): PayoutRow[]` — amounts sum exactly to `totalFund` after rounding (remainder assigned to the largest-ownership member)

- [ ] **Step 1: Write the failing test**

Create `lib/cycle-distribution.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { computeCyclePayouts } from './cycle-distribution'
import type { OwnershipRow } from './ownership'

function pct(userId: string, ownershipPct: number): OwnershipRow {
  return { userId, totalContributed: 0, ownershipPct }
}

describe('computeCyclePayouts', () => {
  it('splits an evenly-owned fund evenly', () => {
    const payouts = computeCyclePayouts(1000, [pct('a', 50), pct('b', 50)])
    expect(payouts).toEqual([
      { userId: 'a', amount: 500 },
      { userId: 'b', amount: 500 },
    ])
  })

  it('matches the spec example (₱126,000 fund, four members)', () => {
    const payouts = computeCyclePayouts(126000, [
      pct('juan', 26.79),
      pct('maria', 21.43),
      pct('ana', 30.36),
      pct('carl', 21.43),
    ])
    const total = payouts.reduce((acc, p) => acc + p.amount, 0)
    expect(Math.round(total * 100) / 100).toBe(126000)
  })

  it('assigns the rounding remainder to the largest-ownership member', () => {
    const payouts = computeCyclePayouts(100, [
      pct('a', 33.33),
      pct('b', 33.33),
      pct('c', 33.34),
    ])
    const sum = payouts.reduce((acc, p) => acc + p.amount, 0)
    expect(Math.round(sum * 100) / 100).toBe(100)
    const c = payouts.find((p) => p.userId === 'c')!
    expect(c.amount).toBeGreaterThanOrEqual(33.33)
  })

  it('returns [] when the fund is zero or negative', () => {
    expect(computeCyclePayouts(0, [pct('a', 100)])).toEqual([])
    expect(computeCyclePayouts(-5, [pct('a', 100)])).toEqual([])
  })

  it('returns [] when ownership is empty', () => {
    expect(computeCyclePayouts(100, [])).toEqual([])
  })

  it('preserves input order', () => {
    const payouts = computeCyclePayouts(200, [pct('z', 25), pct('a', 75)])
    expect(payouts.map((p) => p.userId)).toEqual(['z', 'a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- lib/cycle-distribution.test.ts
```

Expected: FAIL with "Cannot find module './cycle-distribution'".

- [ ] **Step 3: Implement `computeCyclePayouts`**

Create `lib/cycle-distribution.ts`:

```ts
import type { OwnershipRow } from './ownership'

export type PayoutRow = {
  userId: string
  amount: number
}

export function computeCyclePayouts(
  totalFund: number,
  ownership: OwnershipRow[],
): PayoutRow[] {
  if (totalFund <= 0 || ownership.length === 0) return []

  const payouts: PayoutRow[] = ownership.map((r) => ({
    userId: r.userId,
    amount: round2((r.ownershipPct / 100) * totalFund),
  }))

  const sum = round2(payouts.reduce((acc, p) => acc + p.amount, 0))
  const remainder = round2(totalFund - sum)
  if (remainder !== 0) {
    let idxLargest = 0
    for (let i = 1; i < ownership.length; i++) {
      if (ownership[i].ownershipPct > ownership[idxLargest].ownershipPct) {
        idxLargest = i
      }
    }
    payouts[idxLargest].amount = round2(payouts[idxLargest].amount + remainder)
  }

  return payouts
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- lib/cycle-distribution.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/cycle-distribution.ts lib/cycle-distribution.test.ts
git commit -m "feat(cycle): payout calculator by ownership share"
```

---

## Task 5: Optional investment feature

**Files:**
- Modify: `app/(app)/groups/[groupId]/actions.ts` (set `contribution_type` on required; add `submitInvestment`)
- Create: `components/group/invest-button.tsx`
- Modify: `app/(app)/groups/[groupId]/page.tsx` (add `<InvestButton>`)

**Interfaces:**
- Consumes: `sendAMBPHP`, `decryptSecret` from `@/lib/stellar`
- Produces:
  - `submitInvestment(groupId: string, amount: number): Promise<{ ok: true; txHash: string } | { ok: false; error: string }>`
  - `<InvestButton groupId: string />` client component

- [ ] **Step 1: Add `submitInvestment` and set contribution_type on required**

Replace `app/(app)/groups/[groupId]/actions.ts` with:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { decryptSecret, sendAMBPHP } from '@/lib/stellar'
import { computeCurrentCycle, computeCycleDueDate, type Cadence } from '@/lib/cycles'
import { recomputeCreditScore } from '@/lib/credit-inputs'

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
    .select('id, stellar_account_id, contribution_amount, cadence, created_at, cycle_status')
    .eq('id', groupId)
    .single()
  if (!group || !group.stellar_account_id) {
    return { ok: false, error: 'Group not found or missing Stellar account' }
  }
  if (group.cycle_status === 'closed') {
    return { ok: false, error: 'Cycle is closed to new contributions' }
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
    .eq('contribution_type', 'required')
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
    contribution_type: 'required',
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
  await recomputeCreditScore(user.id).catch(() => undefined)
  return { ok: true, txHash }
}

export async function submitInvestment(
  groupId: string,
  amount: number,
): Promise<{ ok: true; txHash: string } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
    return { ok: false, error: 'Investment must be between 0 and 1,000,000' }
  }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { ok: false, error: 'Not a member of this group' }

  const { data: group } = await supabase
    .from('groups')
    .select('id, stellar_account_id, cycle_status')
    .eq('id', groupId)
    .single()
  if (!group?.stellar_account_id) {
    return { ok: false, error: 'Group not found or missing Stellar account' }
  }
  if (group.cycle_status === 'closed') {
    return { ok: false, error: 'Cycle is closed to new investments' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stellar_secret_encrypted')
    .eq('id', user.id)
    .single()
  if (!profile?.stellar_secret_encrypted) {
    return { ok: false, error: 'Wallet not provisioned' }
  }

  let txHash: string
  try {
    const secret = decryptSecret(profile.stellar_secret_encrypted)
    const result = await sendAMBPHP(
      secret,
      group.stellar_account_id,
      String(amount),
    )
    txHash = result.hash
  } catch (err) {
    return { ok: false, error: `Stellar payment failed: ${(err as Error).message}` }
  }

  const { error: insertErr } = await supabase.from('contributions').insert({
    group_id: groupId,
    user_id: user.id,
    amount,
    contribution_type: 'optional',
    cycle_number: null,
    stellar_tx_hash: txHash,
    status: 'confirmed',
    due_date: null,
    paid_at: new Date().toISOString(),
  })
  if (insertErr) return { ok: false, error: `DB insert failed: ${insertErr.message}` }

  revalidatePath(`/groups/${groupId}`)
  return { ok: true, txHash }
}
```

- [ ] **Step 2: Create the `InvestButton` client component**

Create `components/group/invest-button.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { submitInvestment } from '@/app/(app)/groups/[groupId]/actions'

export function InvestButton({ groupId }: { groupId: string }) {
  const [amount, setAmount] = useState('')
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok'; txHash: string } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    const parsed = Number(amount)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setStatus({ kind: 'err', error: 'Enter a positive amount' })
      return
    }
    startTransition(async () => {
      const result = await submitInvestment(groupId, parsed)
      if (result.ok) {
        setAmount('')
        setStatus({ kind: 'ok', txHash: result.txHash })
      } else {
        setStatus({ kind: 'err', error: result.error })
      }
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs font-bold uppercase tracking-widest text-body-subtle">
        Optional investment (AMBPHP)
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="decimal"
          min="1"
          step="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g. 500"
          className="flex-1 rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft"
        />
        <button
          type="submit"
          disabled={pending || !amount}
          className={[
            'inline-flex items-center justify-center gap-2',
            'rounded-xl border-2 px-5 py-3',
            'text-sm font-bold uppercase tracking-widest',
            'transition-all duration-100',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft',
            pending || !amount
              ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {pending ? 'Sending…' : 'Invest'}
        </button>
      </div>

      {status.kind === 'ok' && (
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${status.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-brand hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          View transaction on Stellar Expert
        </a>
      )}

      {status.kind === 'err' && (
        <div className="rounded-xl border-2 border-border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {status.error}
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 3: Wire `InvestButton` into group overview**

Edit `app/(app)/groups/[groupId]/page.tsx`:

Add near the other component imports at the top:

```tsx
import { InvestButton } from '@/components/group/invest-button'
```

Then inside `CardContent`, immediately below `<ContributionStatus groupId={group.id} />`, add:

```tsx
<InvestButton groupId={group.id} />
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 5: Manual smoke test in dev**

```bash
npm run dev
```

Log in, open a group, type an amount (e.g. `100`) in the optional investment field, submit. Expect success message with a tx link. Verify the group balance rose by 100 AMBPHP and a new row appears in the `contributions` table with `contribution_type='optional'`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(contributions): optional investments alongside required"
```

---

## Task 6: Ownership summary component

**Files:**
- Create: `components/group/ownership-summary.tsx`
- Modify: `app/(app)/groups/[groupId]/page.tsx` (mount `<OwnershipSummary>`)

**Interfaces:**
- Consumes: `computeOwnership`, `MemberContribution` from `@/lib/ownership`
- Produces: `<OwnershipSummary groupId: string, userId: string />` RSC

- [ ] **Step 1: Create the component**

Create `components/group/ownership-summary.tsx`:

```tsx
import { createClient } from '@/utils/supabase/server'
import { computeOwnership, type MemberContribution } from '@/lib/ownership'
import { Percent } from 'lucide-react'

export async function OwnershipSummary({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const supabase = await createClient()

  const { data: contribs } = await supabase
    .from('contributions')
    .select('user_id, amount, profiles:user_id(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'confirmed')

  const byUser = new Map<
    string,
    { userId: string; totalContributed: number; name: string }
  >()
  for (const c of contribs ?? []) {
    const uid = c.user_id as string
    const name = (c as any).profiles?.full_name ?? 'Member'
    const existing = byUser.get(uid) ?? {
      userId: uid,
      totalContributed: 0,
      name,
    }
    existing.totalContributed += Number(c.amount)
    existing.name = name
    byUser.set(uid, existing)
  }

  const rows: MemberContribution[] = Array.from(byUser.values()).map((v) => ({
    userId: v.userId,
    totalContributed: v.totalContributed,
  }))
  const ownership = computeOwnership(rows)
  const nameByUser = new Map(
    Array.from(byUser.values()).map((v) => [v.userId, v.name]),
  )

  const sorted = ownership.slice().sort((a, b) => b.ownershipPct - a.ownershipPct)
  const you = ownership.find((r) => r.userId === userId)

  return (
    <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
          <Percent className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">
            Your ownership
          </p>
          <p className="text-2xl font-bold text-heading">
            {(you?.ownershipPct ?? 0).toFixed(2)}%
          </p>
          <p className="text-xs text-body-subtle">
            Based on {(you?.totalContributed ?? 0).toFixed(2)} AMBPHP contributed
          </p>
        </div>
      </div>

      {sorted.length > 0 && (
        <ul className="mt-4 divide-y-2 divide-border-default border-t-2 border-border-default">
          {sorted.slice(0, 5).map((r) => (
            <li
              key={r.userId}
              className="flex items-center justify-between py-2.5 text-sm"
            >
              <span className="truncate text-body-subtle">
                {nameByUser.get(r.userId) ?? 'Member'}
                {r.userId === userId && (
                  <span className="ml-1 text-fg-brand-strong">(you)</span>
                )}
              </span>
              <span className="font-semibold text-heading">
                {r.ownershipPct.toFixed(2)}%
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

Edit `app/(app)/groups/[groupId]/page.tsx`.

Add near the other component imports:

```tsx
import { OwnershipSummary } from '@/components/group/ownership-summary'
```

Inside `CardContent`, in the same slot where `<InterestSummary>` used to be (below the `<ContributionStatus>` block and above/near the invest button), add:

```tsx
<OwnershipSummary groupId={group.id} userId={user.id} />
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open a group with existing contributions; the OwnershipSummary should show your % and a top-5 leaderboard. If you were the only contributor, you show 100%.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(group): ownership summary on overview"
```

---

## Task 7: Cycle-end distribute action + admin UI

**Files:**
- Modify: `lib/stellar.ts` (add `distributePot()`)
- Create: `app/(app)/groups/[groupId]/admin/cycle/actions.ts`
- Create: `app/(app)/groups/[groupId]/admin/cycle/page.tsx`
- Create: `app/(app)/groups/[groupId]/admin/cycle/end-cycle-form.tsx`

**Interfaces:**
- Consumes: `computeOwnership`, `computeCyclePayouts`, `getAMBPHPBalance`, `decryptSecret`, existing `MemberContribution`
- Produces:
  - `distributePot(groupSecret: string, payouts: { destination: string; amount: string }[]): Promise<{ hash: string }>`
  - `endCycleAndDistribute(groupId: string): Promise<{ ok: true; txHash: string; payoutCount: number } | { ok: false; error: string }>`

- [ ] **Step 1: Add `distributePot` to `lib/stellar.ts`**

Append to `lib/stellar.ts`:

```ts
// Distribute the group's AMBPHP pot to a list of recipients in a single tx.
// Group master key signs alone (threshold = 1 from setupGroupMultisig).
// Stellar limits ops per tx to 100; assumes groups have < 100 members.
export async function distributePot(
  groupSecret: string,
  payouts: { destination: string; amount: string }[],
): Promise<{ hash: string }> {
  if (payouts.length === 0) throw new Error('No payouts to distribute')
  if (payouts.length > 100) throw new Error('Too many payouts for a single tx (max 100)')

  const groupKp = StellarSdk.Keypair.fromSecret(groupSecret)
  const account = await horizonServer.loadAccount(groupKp.publicKey())

  const builder = new StellarSdk.TransactionBuilder(account, {
    fee: StellarSdk.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
  for (const p of payouts) {
    builder.addOperation(
      StellarSdk.Operation.payment({
        destination: p.destination,
        asset: getAMBPHP(),
        amount: p.amount,
      }),
    )
  }
  const tx = builder.setTimeout(60).build()
  tx.sign(groupKp)
  const result = await horizonServer.submitTransaction(tx)
  return { hash: result.hash }
}
```

- [ ] **Step 2: Create the `endCycleAndDistribute` server action**

Create `app/(app)/groups/[groupId]/admin/cycle/actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import {
  decryptSecret,
  distributePot,
  getAMBPHPBalance,
} from '@/lib/stellar'
import { computeOwnership, type MemberContribution } from '@/lib/ownership'
import { computeCyclePayouts } from '@/lib/cycle-distribution'

export async function endCycleAndDistribute(
  groupId: string,
): Promise<
  | { ok: true; txHash: string; payoutCount: number }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated' }

  const { data: group } = await supabase
    .from('groups')
    .select(
      'id, admin_id, name, stellar_account_id, stellar_secret_encrypted, current_cycle_number, cycle_status',
    )
    .eq('id', groupId)
    .single()
  if (!group) return { ok: false, error: 'Group not found' }
  if (group.admin_id !== user.id)
    return { ok: false, error: 'Only the group admin can end the cycle' }
  if (group.cycle_status === 'closed')
    return { ok: false, error: 'Cycle is already closed' }
  if (!group.stellar_account_id || !group.stellar_secret_encrypted)
    return { ok: false, error: 'Group Stellar account not provisioned' }

  const { data: contribs } = await supabase
    .from('contributions')
    .select('user_id, amount, profiles:user_id(stellar_public_key)')
    .eq('group_id', groupId)
    .eq('status', 'confirmed')

  const byUser = new Map<
    string,
    { userId: string; totalContributed: number; destination: string }
  >()
  for (const c of contribs ?? []) {
    const uid = c.user_id as string
    const dest = ((c as any).profiles?.stellar_public_key as string) ?? ''
    const existing = byUser.get(uid) ?? {
      userId: uid,
      totalContributed: 0,
      destination: dest,
    }
    existing.totalContributed += Number(c.amount)
    if (dest) existing.destination = dest
    byUser.set(uid, existing)
  }

  const eligible = Array.from(byUser.values()).filter(
    (v) => v.totalContributed > 0 && v.destination,
  )
  if (eligible.length === 0)
    return { ok: false, error: 'No eligible members with contributions' }

  const members: MemberContribution[] = eligible.map((v) => ({
    userId: v.userId,
    totalContributed: v.totalContributed,
  }))
  const ownership = computeOwnership(members)

  const balanceStr = await getAMBPHPBalance(group.stellar_account_id).catch(
    () => '0',
  )
  const totalFund = Number(balanceStr)
  if (!(totalFund > 0))
    return { ok: false, error: 'Group has no distributable balance' }

  const payouts = computeCyclePayouts(totalFund, ownership)
  if (payouts.length === 0)
    return { ok: false, error: 'No payouts computed' }

  const destinationByUser = new Map(eligible.map((v) => [v.userId, v.destination]))
  const stellarPayouts = payouts
    .filter((p) => p.amount > 0)
    .map((p) => ({
      destination: destinationByUser.get(p.userId)!,
      amount: p.amount.toFixed(2),
    }))
  if (stellarPayouts.length === 0)
    return { ok: false, error: 'All payouts were zero' }

  let txHash: string
  try {
    const secret = decryptSecret(group.stellar_secret_encrypted)
    const result = await distributePot(secret, stellarPayouts)
    txHash = result.hash
  } catch (err) {
    return {
      ok: false,
      error: `Stellar distribution failed: ${(err as Error).message}`,
    }
  }

  const ownershipByUser = new Map(ownership.map((r) => [r.userId, r]))
  const distributionRows = payouts.map((p) => ({
    group_id: groupId,
    cycle_number: group.current_cycle_number,
    member_id: p.userId,
    total_contributed: ownershipByUser.get(p.userId)!.totalContributed,
    ownership_pct: ownershipByUser.get(p.userId)!.ownershipPct,
    payout_amount: p.amount,
    stellar_tx_hash: txHash,
  }))
  await supabase.from('cycle_distributions').insert(distributionRows)

  await supabase
    .from('groups')
    .update({ cycle_status: 'closed' })
    .eq('id', groupId)

  const notifRows = payouts.map((p) => ({
    user_id: p.userId,
    group_id: groupId,
    type: 'cycle_distribution',
    message: `Cycle ${group.current_cycle_number} for ${group.name} closed. You received ${p.amount.toFixed(2)} AMBPHP.`,
  }))
  if (notifRows.length > 0) {
    await supabase.from('notifications').insert(notifRows)
  }

  revalidatePath(`/groups/${groupId}`)
  revalidatePath(`/groups/${groupId}/admin/cycle`)
  return { ok: true, txHash, payoutCount: payouts.length }
}
```

- [ ] **Step 3: Create the admin cycle page (RSC)**

Create `app/(app)/groups/[groupId]/admin/cycle/page.tsx`:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getAMBPHPBalance } from '@/lib/stellar'
import { computeOwnership, type MemberContribution } from '@/lib/ownership'
import { computeCyclePayouts } from '@/lib/cycle-distribution'
import { EndCycleForm } from './end-cycle-form'

export default async function AdminCyclePage({
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
    .select(
      'id, name, admin_id, stellar_account_id, current_cycle_number, cycle_status',
    )
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

  const { data: contribs } = await supabase
    .from('contributions')
    .select('user_id, amount, profiles:user_id(full_name)')
    .eq('group_id', groupId)
    .eq('status', 'confirmed')

  const byUser = new Map<
    string,
    { userId: string; totalContributed: number; name: string }
  >()
  for (const c of contribs ?? []) {
    const uid = c.user_id as string
    const name = ((c as any).profiles?.full_name as string) ?? 'Member'
    const existing = byUser.get(uid) ?? {
      userId: uid,
      totalContributed: 0,
      name,
    }
    existing.totalContributed += Number(c.amount)
    existing.name = name
    byUser.set(uid, existing)
  }

  const members: MemberContribution[] = Array.from(byUser.values()).map((v) => ({
    userId: v.userId,
    totalContributed: v.totalContributed,
  }))
  const ownership = computeOwnership(members)

  let balance = '0'
  if (group.stellar_account_id) {
    try {
      balance = await getAMBPHPBalance(group.stellar_account_id)
    } catch {
      balance = '0'
    }
  }
  const totalFund = Number(balance)
  const payouts = computeCyclePayouts(totalFund, ownership)
  const payoutByUser = new Map(payouts.map((p) => [p.userId, p.amount]))

  const rows = ownership
    .slice()
    .sort((a, b) => b.ownershipPct - a.ownershipPct)
    .map((r) => ({
      userId: r.userId,
      name: byUser.get(r.userId)?.name ?? 'Member',
      totalContributed: r.totalContributed,
      ownershipPct: r.ownershipPct,
      payout: payoutByUser.get(r.userId) ?? 0,
    }))

  const closed = group.cycle_status === 'closed'

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">
          End cycle — {group.name}
        </h1>
        <p className="text-sm text-body-subtle">
          Cycle {group.current_cycle_number}. Distributes the entire fund among
          members proportional to ownership.
        </p>
      </div>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
              Distributable fund
            </p>
            <p className="text-2xl font-bold text-heading">
              {totalFund.toFixed(2)} AMBPHP
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
              Status
            </p>
            <p className="text-2xl font-bold text-heading">
              {closed ? 'Closed' : 'Active'}
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <h2 className="mb-4 text-lg font-bold text-heading">Preview</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-body-subtle">
            No contributions recorded — nothing to distribute.
          </p>
        ) : (
          <ul className="divide-y-2 divide-border-default">
            {rows.map((r) => (
              <li
                key={r.userId}
                className="flex items-center justify-between py-3 text-sm"
              >
                <div>
                  <p className="font-semibold text-heading">{r.name}</p>
                  <p className="text-xs text-body-subtle">
                    {r.totalContributed.toFixed(2)} AMBPHP contributed ·{' '}
                    {r.ownershipPct.toFixed(2)}% ownership
                  </p>
                </div>
                <span className="font-bold text-heading">
                  {r.payout.toFixed(2)} AMBPHP
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!closed && rows.length > 0 && totalFund > 0 && (
        <EndCycleForm groupId={groupId} totalFund={totalFund} />
      )}
    </main>
  )
}
```

- [ ] **Step 4: Create the client confirmation form**

Create `app/(app)/groups/[groupId]/admin/cycle/end-cycle-form.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, Loader2 } from 'lucide-react'
import { endCycleAndDistribute } from './actions'

export function EndCycleForm({
  groupId,
  totalFund,
}: {
  groupId: string
  totalFund: number
}) {
  const [confirmed, setConfirmed] = useState(false)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'ok'; txHash: string; count: number }
    | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onClick() {
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await endCycleAndDistribute(groupId)
      if (result.ok)
        setStatus({
          kind: 'ok',
          txHash: result.txHash,
          count: result.payoutCount,
        })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  const done = status.kind === 'ok'

  return (
    <section className="rounded-xl border-2 border-border-danger bg-danger-soft p-6 shadow-xs">
      <h2 className="mb-2 text-lg font-bold text-heading">
        End cycle & distribute
      </h2>
      <p className="mb-4 text-sm text-body">
        This transfers the full {totalFund.toFixed(2)} AMBPHP fund out of the
        group account in a single Stellar transaction. This cannot be undone.
      </p>

      <label className="mb-4 flex items-start gap-3 text-sm font-medium text-heading">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 h-5 w-5 rounded border-2 border-border-default"
        />
        <span>
          I understand this will empty the group account and lock the cycle.
        </span>
      </label>

      <button
        onClick={onClick}
        disabled={!confirmed || pending || done}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-xl border-2 px-5 py-3.5',
          'text-sm font-bold uppercase tracking-widest',
          'transition-all duration-100',
          !confirmed || pending || done
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
            : 'border-transparent bg-danger text-white [box-shadow:0_4px_0_var(--shadow-brand)] active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending
          ? 'Distributing…'
          : done
            ? 'Cycle closed'
            : 'End cycle & distribute'}
      </button>

      {status.kind === 'ok' && (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-heading">
            Sent {status.count} payouts.
          </p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${status.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-fg-brand hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View transaction on Stellar Expert
          </a>
        </div>
      )}

      {status.kind === 'err' && (
        <div className="mt-4 rounded-xl border-2 border-border-danger bg-neutral-primary px-4 py-3 text-sm font-medium text-danger-strong">
          {status.error}
        </div>
      )}
    </section>
  )
}
```

- [ ] **Step 5: Verify build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 6: Manual smoke test**

Seed a group with at least two members and mixed contributions (required + optional). As admin, navigate to `/groups/<id>/admin/cycle`. Verify the preview lines match the ownership math. Check the confirm box, click "End cycle & distribute". Expect a success message and a `stellar.expert` link. Verify each member's wallet received their share and the group balance is now ~0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(cycle): end-cycle admin action, distributes pot by ownership"
```

---

## Task 8: Cycle distribution history + optional investment credit fix

**Files:**
- Create: `components/group/cycle-distribution-history.tsx`
- Modify: `app/(app)/groups/[groupId]/page.tsx` (mount history component)
- Modify: `lib/credit-inputs.ts` (filter contributions by `contribution_type='required'`)

**Interfaces:**
- Consumes: `cycle_distributions` table rows
- Produces: `<CycleDistributionHistory groupId: string, userId: string />` RSC

- [ ] **Step 1: Create the history component**

Create `components/group/cycle-distribution-history.tsx`:

```tsx
import { createClient } from '@/utils/supabase/server'
import { History } from 'lucide-react'

export async function CycleDistributionHistory({
  groupId,
  userId,
}: {
  groupId: string
  userId: string
}) {
  const supabase = await createClient()

  const { data: rows } = await supabase
    .from('cycle_distributions')
    .select('cycle_number, payout_amount, ownership_pct, stellar_tx_hash, created_at')
    .eq('group_id', groupId)
    .eq('member_id', userId)
    .order('cycle_number', { ascending: false })

  if (!rows || rows.length === 0) return null

  return (
    <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-5 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
          <History className="h-5 w-5" />
        </span>
        <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">
          Cycle payouts you&apos;ve received
        </p>
      </div>

      <ul className="mt-4 divide-y-2 divide-border-default border-t-2 border-border-default">
        {rows.map((r) => (
          <li
            key={`${r.cycle_number}-${r.stellar_tx_hash}`}
            className="flex items-center justify-between py-2.5 text-sm"
          >
            <span className="truncate text-body-subtle">
              Cycle {r.cycle_number} · {Number(r.ownership_pct).toFixed(2)}%
              ownership
            </span>
            <span className="font-semibold text-heading">
              +{Number(r.payout_amount).toFixed(2)} AMBPHP
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

- [ ] **Step 2: Mount it on the group overview**

Edit `app/(app)/groups/[groupId]/page.tsx`.

Add near the other component imports:

```tsx
import { CycleDistributionHistory } from '@/components/group/cycle-distribution-history'
```

Inside `CardContent`, below `<OwnershipSummary>`, add:

```tsx
<CycleDistributionHistory groupId={group.id} userId={user.id} />
```

- [ ] **Step 3: Fix `credit-inputs` to only count required contributions**

Edit `lib/credit-inputs.ts`. Replace the `contributions` fetch block (currently:

```ts
const { data: contributions } = await supabase
  .from('contributions')
  .select('status')
  .eq('user_id', userId)
```

) with:

```ts
const { data: contributions } = await supabase
  .from('contributions')
  .select('status')
  .eq('user_id', userId)
  .eq('contribution_type', 'required')
```

- [ ] **Step 4: Verify build + tests**

```bash
npm run build
npm test
```

Expected: both succeed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(group): cycle distribution history; credit only counts required"
```

---

## Self-Review

### Spec coverage

Every section of `Ambagan_Contribution_and_Ownership_Model.md`:

1. **Required contributions** — existing `submitContribution` retained; explicit `contribution_type='required'` set in Task 5.
2. **Optional investments** — Task 5 (`submitInvestment`, `InvestButton`).
3. **Community fund** — no code change needed; the group Stellar account already accumulates required + optional + interest via existing flows.
4. **Loan requests** — unchanged, out of scope for this refactor.
5. **Loan repayment** — Task 2 removes wrong per-repayment interest attribution; principal + interest lands in the group account on-chain, that's it.
6. **Fund growth** — implicit: nothing drains interest anymore, so it grows the group balance.
7. **Ownership** — Task 3 (`computeOwnership`) and Task 6 (`OwnershipSummary` display).
8. **Final distribution** — Task 4 (`computeCyclePayouts`) + Task 7 (admin action + UI + Stellar payment).
9. **Missed contributions** — Deferred (grace periods, late fees, voting suspension, removal). The plan handles the *distribution* consequence correctly: members with fewer/missed contributions receive lower ownership → lower payout. This matches the model's line "Ownership reflects actual contributions already made." Advanced eligibility rules are post-hackathon.

### Placeholder scan

No "TODO", "TBD", "fill in later", or generic error-handling placeholders found. Each step has concrete code or an exact command.

### Type consistency

- `MemberContribution` — defined once in `lib/ownership.ts`, consumed by `computeOwnership` (Task 3), the admin action (Task 7), and imported in Task 6 (`OwnershipSummary`).
- `OwnershipRow` — defined once in `lib/ownership.ts`, consumed by `computeCyclePayouts` (Task 4) and Task 7.
- `PayoutRow` — defined once in `lib/cycle-distribution.ts`, consumed by Task 7.
- `submitInvestment(groupId: string, amount: number)` — declared in Task 5 action, called with same signature by `InvestButton`.
- `endCycleAndDistribute(groupId: string)` — declared in Task 7 action, called with same signature by `EndCycleForm`.
- `distributePot(groupSecret, payouts)` — declared in Task 7 stellar.ts addition, called from the admin action.
- `cycle_distributions` columns match between the migration (Task 1), the insert in Task 7, and the read in Task 8.

No mismatches found.

---

## Deferred (not in this plan)

- Grace-period / late-fee configuration on groups
- Voting-right suspension for repeat non-payers
- Removal workflow
- Starting a new cycle after distribution (currently `cycle_status='closed'` is terminal; a follow-up plan should add "roll over into cycle N+1")
- `/notifications` page (DB rows now include `cycle_distribution`; the reading UI is a separate stub, unchanged by this plan)
- `/settings` and `/groups/[groupId]/admin` (index) stubs
