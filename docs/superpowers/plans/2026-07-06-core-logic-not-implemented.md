# Core Logic (`not_implemented`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship every function and route in the app that currently throws `not_implemented` or returns HTTP 501 — credit score, default state machine, reminder emails, and ledger export — so the hackathon demo covers the full spec.

**Architecture:** Four independent subsystems delivered as ordered phases in one plan (Credit → Defaults → Reminders → Export). Pure math lives in `lib/*.ts` with vitest coverage; state-changing endpoints are Next.js Route Handlers or Server Actions that decrypt custodial secrets only on the server and never expose plaintext to the client. Default handling is a backend-only state machine (no Soroban call — the on-chain part is out of scope per §7.4 of the earlier Phase-6 plan). Reminders use Resend via `lib/email.ts`. Export is CSV-only (no PDF).

**Tech Stack:** Next.js 16 App Router (Route Handlers + Server Actions + RSC), Supabase (Postgres + Auth + RLS), Stellar SDK 12 (read-only for export ledger enrichment), Resend 4 for email, vitest, TypeScript.

## Global Constraints

- Never expose plaintext Stellar secrets to the client — Route Handlers/Server Actions decrypt secrets in memory only.
- Every Server Action and Route Handler returns `{ ok: true, ... } | { ok: false, error: string }` (JSON) — never throws to the client.
- All UI follows the `lingo-design` skill (Forest & Gold): brand `#1A4731`, gold accent `#C9962A`, mint surface `#E8F5EE`, cream warm-bg `#F5F0E8`, 2px borders, 12px radius, buttons use `[box-shadow:0_4px_0_var(--shadow-brand)]` flat drop-shadow.
- Every page that reads Supabase auth cookies at render time declares `export const dynamic = 'force-dynamic'` as the first line.
- Money display uses `.toFixed(2)` with an `AMBPHP` suffix.
- Cron endpoints are `GET` and require a bearer token from `process.env.CRON_SECRET`; if the header is absent or wrong, return `{ ok: false, error: 'unauthorized' }` with status 401.
- All Horizon calls go through `horizonServer` in `lib/stellar.ts` (lazy env access).
- Every task ends with a working, committable increment — commit after each task.

---

## File Structure

**Create:**
- `supabase/migrations/0005_default_tracking_columns.sql` — adds `default_stage_updated_at` on `loans`, `credit_score_updated_at` on `profiles`.
- `lib/credit.ts` — pure credit-score math + letter grade.
- `lib/credit.test.ts` — vitest.
- `lib/credit-inputs.ts` — Supabase → `CreditInputs` builder (used by credit recompute).
- `lib/defaults.ts` — implement stage math + loss share math (currently throws).
- `lib/defaults.test.ts` — vitest.
- `app/(app)/groups/[groupId]/admin/defaults/defaults-actions.ts` — `resolveDefault` server action wrapping the resolution API for form submits.
- `app/(app)/groups/[groupId]/admin/defaults/default-row.tsx` — client component with Waive / Partial / Dispute buttons.
- `app/(app)/groups/[groupId]/admin/export/export-actions.ts` — trigger export download.
- `lib/email-templates.ts` — pure functions returning `{ subject, html }` per template name.

**Modify:**
- `lib/email.ts` — replace stub with Resend implementation.
- `lib/credit.ts` — currently only exports stub signatures; replace entire file.
- `lib/defaults.ts` — currently only exports stub signatures; replace entire file.
- `app/api/defaults/[loanId]/route.ts` — replace 501 with real POST handler.
- `app/api/cron/reconcile/route.ts` — replace 501 with overdue-repayment scanner.
- `app/api/cron/reminders/route.ts` — replace 501 with daily reminder pipeline.
- `app/api/groups/[groupId]/export/route.ts` — replace 501 with CSV export.
- `app/(app)/groups/[groupId]/admin/defaults/page.tsx` — replace stub with the defaults list.
- `app/(app)/groups/[groupId]/admin/export/page.tsx` — replace stub with export trigger.
- `app/(app)/groups/[groupId]/loans/loan-card.tsx` — add credit-letter-grade badge on the borrower's row.
- `app/(app)/profile/page.tsx` — replace stub with credit score + stats.
- `.env.example` — add `CRON_SECRET`, `RESEND_FROM_EMAIL`.

---

## Interfaces (locked contracts across tasks)

```ts
// lib/credit.ts
export type CreditInputs = {
  onTimeContributions: number
  lateContributions: number
  missedContributions: number
  loansRepaidOnSchedule: number
  activeDefaults: number
  monthsAsMember: number
}
export function computeCreditScore(inputs: CreditInputs): number
export function creditLetterGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F'

// lib/credit-inputs.ts
export async function buildCreditInputs(userId: string): Promise<CreditInputs>
export async function recomputeCreditScore(userId: string): Promise<number>

// lib/defaults.ts
export type DefaultStage = 0 | 1 | 2 | 3 | 4
export function stageForDaysPastDue(daysPastDue: number): DefaultStage
export function computeLossShares(
  totalLoss: number,
  memberContributions: Record<string, number>,
): Record<string, number>

// lib/email.ts
export type EmailTemplate =
  | 'contribution_reminder'
  | 'repayment_reminder'
  | 'vote_opened'
  | 'loan_decision'
  | 'default_escalation'
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }>

// lib/email-templates.ts
export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): { subject: string; html: string }
```

**Stage thresholds (locked here, referenced in tests):**

| Days past due | Stage | Meaning |
|---|---|---|
| 0 | 0 | Current — no default |
| 1–7 | 1 | Grace — reminder sent, no penalty |
| 8–30 | 2 | Extension window — borrower may open an extension request |
| 31–60 | 3 | Admin resolution — waive / partial settle / dispute |
| 61+ | 4 | Loss absorbed — distributed across non-borrower members |

**Credit score formula (locked here, referenced in tests):**

Base = 500. Bonuses: `+5` per on-time contribution (cap `+200`); `+30` per loan repaid on schedule (cap `+150`); `+5` per month of membership (cap `+100`). Penalties: `-10` per late contribution (cap `-100`); `-30` per missed contribution (cap `-200`); `-100` per active default (cap `-300`). Result clamped to `[0, 1000]`.

Letter grades: `A ≥ 800`, `B ≥ 700`, `C ≥ 600`, `D ≥ 500`, `F < 500`.

---

# Phase A — Credit Score

## Task 1: Migration for tracking columns

**Files:**
- Create: `supabase/migrations/0005_default_tracking_columns.sql`

**Interfaces:**
- Consumes: nothing.
- Produces: two new nullable timestamp columns used by later tasks for idempotency guards.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_default_tracking_columns.sql`:

```sql
-- Track when each default_stage was last transitioned so the reconciler can
-- avoid double-notifying on the same stage in the same day.
alter table public.loans
  add column if not exists default_stage_updated_at timestamptz;

-- Track when a user's credit score was last recomputed so we can skip work
-- when it was already refreshed in the last hour.
alter table public.profiles
  add column if not exists credit_score_updated_at timestamptz;
```

- [ ] **Step 2: Apply the migration**

Paste the file contents into the Supabase SQL Editor and run. Confirm both columns appear (`Table Editor → loans / profiles`).

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0005_default_tracking_columns.sql
git commit -m "feat(db): add default_stage_updated_at + credit_score_updated_at"
```

---

## Task 2: Credit score math (pure functions + tests)

**Files:**
- Modify: `lib/credit.ts` (replace entire file)
- Create: `lib/credit.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `computeCreditScore(inputs)` returning integer `0..1000`, and `creditLetterGrade(score)` returning `'A'|'B'|'C'|'D'|'F'`. Signatures identical to the existing stub.

- [ ] **Step 1: Write the failing tests**

Create `lib/credit.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeCreditScore, creditLetterGrade } from './credit'

const zero = {
  onTimeContributions: 0,
  lateContributions: 0,
  missedContributions: 0,
  loansRepaidOnSchedule: 0,
  activeDefaults: 0,
  monthsAsMember: 0,
}

describe('computeCreditScore', () => {
  it('returns base 500 for a new member with no history', () => {
    expect(computeCreditScore(zero)).toBe(500)
  })

  it('adds +5 per on-time contribution, capped at +200', () => {
    expect(computeCreditScore({ ...zero, onTimeContributions: 10 })).toBe(550)
    expect(computeCreditScore({ ...zero, onTimeContributions: 100 })).toBe(700) // 200 cap
  })

  it('adds +30 per loan repaid on schedule, capped at +150', () => {
    expect(computeCreditScore({ ...zero, loansRepaidOnSchedule: 3 })).toBe(590)
    expect(computeCreditScore({ ...zero, loansRepaidOnSchedule: 20 })).toBe(650) // 150 cap
  })

  it('adds +5 per month as member, capped at +100', () => {
    expect(computeCreditScore({ ...zero, monthsAsMember: 5 })).toBe(525)
    expect(computeCreditScore({ ...zero, monthsAsMember: 40 })).toBe(600) // 100 cap
  })

  it('penalizes -10 per late contribution, capped at -100', () => {
    expect(computeCreditScore({ ...zero, lateContributions: 5 })).toBe(450)
    expect(computeCreditScore({ ...zero, lateContributions: 50 })).toBe(400) // 100 cap
  })

  it('penalizes -30 per missed contribution, capped at -200', () => {
    expect(computeCreditScore({ ...zero, missedContributions: 3 })).toBe(410)
    expect(computeCreditScore({ ...zero, missedContributions: 20 })).toBe(300) // 200 cap
  })

  it('penalizes -100 per active default, capped at -300', () => {
    expect(computeCreditScore({ ...zero, activeDefaults: 2 })).toBe(300)
    expect(computeCreditScore({ ...zero, activeDefaults: 10 })).toBe(200) // 300 cap
  })

  it('clamps result to [0, 1000]', () => {
    const veryGood = {
      ...zero,
      onTimeContributions: 200,
      loansRepaidOnSchedule: 20,
      monthsAsMember: 60,
    }
    expect(computeCreditScore(veryGood)).toBe(950)

    const veryBad = {
      ...zero,
      lateContributions: 20,
      missedContributions: 20,
      activeDefaults: 5,
    }
    expect(computeCreditScore(veryBad)).toBe(0)
  })
})

describe('creditLetterGrade', () => {
  it('returns A for 800+', () => {
    expect(creditLetterGrade(800)).toBe('A')
    expect(creditLetterGrade(1000)).toBe('A')
  })
  it('returns B for 700..799', () => {
    expect(creditLetterGrade(700)).toBe('B')
    expect(creditLetterGrade(799)).toBe('B')
  })
  it('returns C for 600..699', () => {
    expect(creditLetterGrade(600)).toBe('C')
    expect(creditLetterGrade(699)).toBe('C')
  })
  it('returns D for 500..599', () => {
    expect(creditLetterGrade(500)).toBe('D')
    expect(creditLetterGrade(599)).toBe('D')
  })
  it('returns F below 500', () => {
    expect(creditLetterGrade(0)).toBe('F')
    expect(creditLetterGrade(499)).toBe('F')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run lib/credit.test.ts`
Expected: FAIL — all cases throw `not_implemented`.

- [ ] **Step 3: Implement the module**

Replace `lib/credit.ts` entirely with:

```ts
// Credit score calculator per FR-CR-01. Output 0..1000. Letter grade per FR-CR-03.

export type CreditInputs = {
  onTimeContributions: number
  lateContributions: number
  missedContributions: number
  loansRepaidOnSchedule: number
  activeDefaults: number
  monthsAsMember: number
}

const BASE_SCORE = 500

export function computeCreditScore(inputs: CreditInputs): number {
  const onTimeBonus = capped(inputs.onTimeContributions * 5, 200)
  const repaidBonus = capped(inputs.loansRepaidOnSchedule * 30, 150)
  const tenureBonus = capped(inputs.monthsAsMember * 5, 100)

  const latePenalty = capped(inputs.lateContributions * 10, 100)
  const missedPenalty = capped(inputs.missedContributions * 30, 200)
  const defaultPenalty = capped(inputs.activeDefaults * 100, 300)

  const raw =
    BASE_SCORE +
    onTimeBonus + repaidBonus + tenureBonus -
    latePenalty - missedPenalty - defaultPenalty

  return clamp(raw, 0, 1000)
}

export function creditLetterGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 800) return 'A'
  if (score >= 700) return 'B'
  if (score >= 600) return 'C'
  if (score >= 500) return 'D'
  return 'F'
}

function capped(value: number, cap: number): number {
  return Math.min(Math.max(value, 0), cap)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm vitest run lib/credit.test.ts`
Expected: PASS — all 13 cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/credit.ts lib/credit.test.ts
git commit -m "feat(credit): implement 0..1000 score + letter grade"
```

---

## Task 3: Credit inputs builder + recompute + persistence

**Files:**
- Create: `lib/credit-inputs.ts`

**Interfaces:**
- Consumes: `computeCreditScore`, `CreditInputs` from Task 2; Supabase server client.
- Produces:
  - `buildCreditInputs(userId: string): Promise<CreditInputs>` — reads `contributions`, `loans`, `repayments`, `group_members` and rolls them into the shape Task 2 expects.
  - `recomputeCreditScore(userId: string): Promise<number>` — calls `buildCreditInputs`, computes the score, writes it (with `credit_score_updated_at = now()`) to `profiles`, and returns the score.

- [ ] **Step 1: Create the module**

Create `lib/credit-inputs.ts`:

```ts
import { createClient } from '@/utils/supabase/server'
import { computeCreditScore, type CreditInputs } from './credit'

export async function buildCreditInputs(userId: string): Promise<CreditInputs> {
  const supabase = await createClient()

  const { data: contributions } = await supabase
    .from('contributions')
    .select('status')
    .eq('user_id', userId)

  let onTimeContributions = 0
  let lateContributions = 0
  let missedContributions = 0
  for (const c of contributions ?? []) {
    if (c.status === 'confirmed') onTimeContributions += 1
    else if (c.status === 'late') lateContributions += 1
    else if (c.status === 'missed') missedContributions += 1
  }

  const { data: loans } = await supabase
    .from('loans')
    .select('id, status, default_stage')
    .eq('borrower_id', userId)

  let loansRepaidOnSchedule = 0
  let activeDefaults = 0
  for (const l of loans ?? []) {
    if (l.status === 'repaid') loansRepaidOnSchedule += 1
    if ((l.default_stage ?? 0) >= 1 && (l.default_stage ?? 0) <= 3) {
      activeDefaults += 1
    }
  }

  const { data: memberships } = await supabase
    .from('group_members')
    .select('joined_at')
    .eq('user_id', userId)

  const now = Date.now()
  const monthMs = 30 * 24 * 60 * 60 * 1000
  let monthsAsMember = 0
  for (const m of memberships ?? []) {
    const joined = new Date(m.joined_at as string).getTime()
    monthsAsMember += Math.max(0, Math.floor((now - joined) / monthMs))
  }

  return {
    onTimeContributions,
    lateContributions,
    missedContributions,
    loansRepaidOnSchedule,
    activeDefaults,
    monthsAsMember,
  }
}

export async function recomputeCreditScore(userId: string): Promise<number> {
  const supabase = await createClient()
  const inputs = await buildCreditInputs(userId)
  const score = computeCreditScore(inputs)
  await supabase
    .from('profiles')
    .update({
      credit_score: score,
      credit_score_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
  return score
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from this file.

- [ ] **Step 3: Commit**

```bash
git add lib/credit-inputs.ts
git commit -m "feat(credit): build inputs from Supabase and persist recomputed score"
```

---

## Task 4: Show credit letter grade on loan cards

**Files:**
- Modify: `app/(app)/groups/[groupId]/loans/page.tsx`
- Modify: `app/(app)/groups/[groupId]/loans/loan-card.tsx`

**Interfaces:**
- Consumes: `creditLetterGrade` from Task 2; borrower's `profiles.credit_score`.
- Produces: A letter-grade badge on each loan card next to the borrower name.

- [ ] **Step 1: Fetch borrower credit score in the RSC**

In `app/(app)/groups/[groupId]/loans/page.tsx`, change the `loans` select to include the borrower's credit score:

Replace:

```tsx
    .select('id, amount, purpose_tag, description, status, borrower_id, voting_closes_at, created_at, profiles:borrower_id(full_name)')
```

with:

```tsx
    .select('id, amount, purpose_tag, description, status, borrower_id, voting_closes_at, created_at, profiles:borrower_id(full_name, credit_score)')
```

- [ ] **Step 2: Pass the score through to `LoanCard`**

At the `LoanCard` invocation inside the map in the same file, no changes are needed — the loan object already has the nested `profiles` shape. But update the `LoanRow` type in `loan-card.tsx` (below) to include it.

- [ ] **Step 3: Render the badge in the client card**

In `app/(app)/groups/[groupId]/loans/loan-card.tsx`, add the import at the top:

```tsx
import { creditLetterGrade } from '@/lib/credit'
```

Update the `LoanRow` type to include the score:

```tsx
type LoanRow = {
  id: string
  amount: number
  purpose_tag: string
  description: string | null
  status: string
  borrower_id: string
  profiles?: { full_name: string; credit_score: number | null } | null
}
```

In the JSX, immediately below the `by {loan.profiles?.full_name ...}` paragraph, add:

```tsx
{loan.profiles?.credit_score != null && (
  <span
    className={`ml-2 inline-flex items-center rounded-full border-2 px-2 py-0.5 text-[11px] font-bold ${
      creditLetterGrade(loan.profiles.credit_score) === 'A' || creditLetterGrade(loan.profiles.credit_score) === 'B'
        ? 'border-border-brand-subtle bg-surface text-fg-brand-strong'
        : creditLetterGrade(loan.profiles.credit_score) === 'C'
        ? 'border-border-warning-subtle bg-warning-soft text-fg-warning'
        : 'border-border-danger-subtle bg-danger-soft text-danger-strong'
    }`}
  >
    Credit {creditLetterGrade(loan.profiles.credit_score)}
  </span>
)}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors from these files.

- [ ] **Step 5: Manually verify**

`pnpm dev`. Log in and visit `/groups/<groupId>/loans` for a group with at least one loan.
Expected: each card shows `Credit D` for the default score of 500 (until Task 5 recomputes real scores).

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/groups/[groupId]/loans/page.tsx" "app/(app)/groups/[groupId]/loans/loan-card.tsx"
git commit -m "feat(credit): show letter grade badge on loan cards"
```

---

## Task 5: Trigger credit recompute inside existing flows + wire profile page

**Files:**
- Modify: `app/(app)/groups/[groupId]/actions.ts` — call `recomputeCreditScore` after a contribution.
- Modify: `app/(app)/groups/[groupId]/repayments/actions.ts` — call `recomputeCreditScore(user.id)` after a repayment.
- Modify: `app/(app)/profile/page.tsx` — render score + grade + input breakdown.

**Interfaces:**
- Consumes: `recomputeCreditScore` from Task 3; `creditLetterGrade` from Task 2; `buildCreditInputs` for showing the breakdown.
- Produces: refreshed score after each successful contribution or repayment, and a working `/profile` page.

- [ ] **Step 1: Recompute on successful contribution**

In `app/(app)/groups/[groupId]/actions.ts`, at the top add:

```typescript
import { recomputeCreditScore } from '@/lib/credit-inputs'
```

Immediately before the final `return { ok: true, txHash }` line, add:

```typescript
await recomputeCreditScore(user.id).catch(() => undefined)
```

- [ ] **Step 2: Recompute on successful repayment**

In `app/(app)/groups/[groupId]/repayments/actions.ts`, at the top add:

```typescript
import { recomputeCreditScore } from '@/lib/credit-inputs'
```

Immediately before the final `return { ok: true, txHash, loanRepaid }` line, add:

```typescript
await recomputeCreditScore(user.id).catch(() => undefined)
```

- [ ] **Step 3: Replace the profile stub**

Overwrite `app/(app)/profile/page.tsx` with:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { buildCreditInputs } from '@/lib/credit-inputs'
import { creditLetterGrade } from '@/lib/credit'
import { TrendingUp } from 'lucide-react'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, credit_score')
    .eq('id', user.id)
    .single()

  const inputs = await buildCreditInputs(user.id)
  const score = profile?.credit_score ?? 500
  const grade = creditLetterGrade(score)

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">
          {profile?.full_name ?? 'Profile'}
        </h1>
        <p className="text-sm text-body-subtle">Your credit and activity across every Ambagan group.</p>
      </div>

      <section className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-fg-brand-strong">
            <TrendingUp className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
              Credit score
            </p>
            <p className="text-3xl font-bold text-heading">
              {score}
              <span className="ml-2 rounded-full border-2 border-border-brand-subtle bg-surface px-2 py-0.5 text-sm font-bold text-fg-brand-strong">
                {grade}
              </span>
            </p>
          </div>
        </div>

        <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Stat label="On-time contributions" value={inputs.onTimeContributions} />
          <Stat label="Late contributions" value={inputs.lateContributions} />
          <Stat label="Missed contributions" value={inputs.missedContributions} />
          <Stat label="Loans repaid on schedule" value={inputs.loansRepaidOnSchedule} />
          <Stat label="Active defaults" value={inputs.activeDefaults} />
          <Stat label="Months as member" value={inputs.monthsAsMember} />
        </ul>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <li className="rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">{label}</p>
      <p className="mt-1 text-xl font-bold text-heading">{value}</p>
    </li>
  )
}
```

- [ ] **Step 4: Manually verify**

`pnpm dev`, log in, visit `/profile`. Score defaults to 500 (D) for new users. Submit a contribution → refresh profile → the on-time counter increases and the score reflects a small bump.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/groups/[groupId]/actions.ts" "app/(app)/groups/[groupId]/repayments/actions.ts" "app/(app)/profile/page.tsx"
git commit -m "feat(credit): recompute after contribution/repayment and render /profile"
```

---

# Phase B — Default Handling

## Task 6: Default stage + loss share math (pure functions + tests)

**Files:**
- Modify: `lib/defaults.ts` (replace entire file)
- Create: `lib/defaults.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `stageForDaysPastDue(daysPastDue: number): DefaultStage` — locked thresholds from the Global Constraints table.
  - `computeLossShares(totalLoss: number, memberContributions: Record<string, number>): Record<string, number>` — distributes `totalLoss` across members proportionally to their `total_contributed`. Rounding remainder goes to the largest contributor. Returns `{}` if `totalLoss <= 0` or every contribution is 0.

- [ ] **Step 1: Write the failing tests**

Create `lib/defaults.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { stageForDaysPastDue, computeLossShares } from './defaults'

describe('stageForDaysPastDue', () => {
  it('returns 0 for current loans', () => {
    expect(stageForDaysPastDue(0)).toBe(0)
    expect(stageForDaysPastDue(-3)).toBe(0)
  })
  it('returns 1 within 1-7 days', () => {
    expect(stageForDaysPastDue(1)).toBe(1)
    expect(stageForDaysPastDue(7)).toBe(1)
  })
  it('returns 2 within 8-30 days', () => {
    expect(stageForDaysPastDue(8)).toBe(2)
    expect(stageForDaysPastDue(30)).toBe(2)
  })
  it('returns 3 within 31-60 days', () => {
    expect(stageForDaysPastDue(31)).toBe(3)
    expect(stageForDaysPastDue(60)).toBe(3)
  })
  it('returns 4 beyond 60 days', () => {
    expect(stageForDaysPastDue(61)).toBe(4)
    expect(stageForDaysPastDue(365)).toBe(4)
  })
})

describe('computeLossShares', () => {
  it('splits proportionally to contributions', () => {
    const shares = computeLossShares(100, { a: 300, b: 100, c: 100 })
    expect(shares).toEqual({ a: 60, b: 20, c: 20 })
  })

  it('gives the rounding remainder to the largest contributor', () => {
    const shares = computeLossShares(10, { a: 3, b: 3, c: 4 })
    // proportional shares: c gets 4.00, a and b get 3.00 each = 10.00 total.
    // if remainder exists, it goes to c (largest).
    const total = Object.values(shares).reduce((acc, v) => acc + v, 0)
    expect(Math.round(total * 100) / 100).toBe(10)
    expect(shares.c).toBeGreaterThanOrEqual(shares.a)
    expect(shares.c).toBeGreaterThanOrEqual(shares.b)
  })

  it('returns {} when total loss is zero or negative', () => {
    expect(computeLossShares(0, { a: 10 })).toEqual({})
    expect(computeLossShares(-5, { a: 10 })).toEqual({})
  })

  it('returns {} when no member has contributed', () => {
    expect(computeLossShares(100, { a: 0, b: 0 })).toEqual({})
  })

  it('handles a single member absorbing the entire loss', () => {
    expect(computeLossShares(50, { solo: 500 })).toEqual({ solo: 50 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm vitest run lib/defaults.test.ts`
Expected: FAIL — all cases throw `not_implemented`.

- [ ] **Step 3: Implement the module**

Replace `lib/defaults.ts` entirely with:

```ts
// Default-handling state machine helpers. Owns: computing which stage a loan
// is in given days past due, and building per-member loss shares proportional
// to contribution history. Stage thresholds are locked at the plan level:
// 0 = current, 1 = 1-7 dpd, 2 = 8-30 dpd, 3 = 31-60 dpd, 4 = 61+ dpd.

export type DefaultStage = 0 | 1 | 2 | 3 | 4

export function stageForDaysPastDue(daysPastDue: number): DefaultStage {
  if (daysPastDue <= 0) return 0
  if (daysPastDue <= 7) return 1
  if (daysPastDue <= 30) return 2
  if (daysPastDue <= 60) return 3
  return 4
}

export function computeLossShares(
  totalLoss: number,
  memberContributions: Record<string, number>,
): Record<string, number> {
  if (totalLoss <= 0) return {}

  const entries = Object.entries(memberContributions)
  const totalContrib = entries.reduce((acc, [, v]) => acc + v, 0)
  if (totalContrib <= 0) return {}

  const shares: Record<string, number> = {}
  for (const [id, contrib] of entries) {
    shares[id] = round2((contrib / totalContrib) * totalLoss)
  }

  const roundedTotal = round2(totalLoss)
  const currentSum = round2(
    Object.values(shares).reduce((acc, v) => acc + v, 0),
  )
  const remainder = round2(roundedTotal - currentSum)
  if (remainder !== 0) {
    let largestId = entries[0][0]
    let largestVal = memberContributions[largestId] ?? 0
    for (const [id, v] of entries) {
      if (v > largestVal) {
        largestId = id
        largestVal = v
      }
    }
    shares[largestId] = round2(shares[largestId] + remainder)
  }
  return shares
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `pnpm vitest run lib/defaults.test.ts`
Expected: PASS — all 10 cases green.

- [ ] **Step 5: Commit**

```bash
git add lib/defaults.ts lib/defaults.test.ts
git commit -m "feat(defaults): stage-for-dpd + proportional loss share math"
```

---

## Task 7: Reconcile cron — sweep overdue repayments and escalate stages

**Files:**
- Modify: `app/api/cron/reconcile/route.ts` (replace 501 stub)

**Interfaces:**
- Consumes: `stageForDaysPastDue` from Task 6; Supabase server client; `CRON_SECRET` env.
- Produces: `GET` route that walks every `pending` repayment, computes its days past due, updates `repayments.status` (`late` for stage 1-2, `missed` for stage 3+), and if it advances the parent loan's `default_stage`, writes it back to `loans` with `default_stage_updated_at = now()` and inserts one `notifications` row per group member for the transition.

- [ ] **Step 1: Add `CRON_SECRET` to `.env.example`**

At the end of `.env.example`, append:

```
# Cron endpoints (require this bearer token in Authorization header)
CRON_SECRET=
```

Then generate a value locally (e.g., `openssl rand -hex 32`) and paste it into your `.env` (not committed).

- [ ] **Step 2: Replace the reconcile route**

Overwrite `app/api/cron/reconcile/route.ts` with:

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { stageForDaysPastDue, type DefaultStage } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

function unauthorized(res: { error: string }) {
  return Response.json({ ok: false, ...res }, { status: 401 })
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return unauthorized({ error: 'unauthorized' })
  }

  const supabase = await createClient()
  const today = new Date()

  const { data: repayments } = await supabase
    .from('repayments')
    .select('id, loan_id, due_date, status')
    .eq('status', 'pending')

  const dpdByLoan = new Map<string, number>()
  const rowsToLate: string[] = []
  const rowsToMissed: string[] = []

  for (const r of repayments ?? []) {
    const due = new Date(r.due_date as string)
    const days = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (days <= 0) continue
    const stage = stageForDaysPastDue(days)
    if (stage === 1 || stage === 2) rowsToLate.push(r.id as string)
    if (stage >= 3) rowsToMissed.push(r.id as string)

    const cur = dpdByLoan.get(r.loan_id as string) ?? 0
    if (days > cur) dpdByLoan.set(r.loan_id as string, days)
  }

  if (rowsToLate.length > 0) {
    await supabase.from('repayments').update({ status: 'late' }).in('id', rowsToLate)
  }
  if (rowsToMissed.length > 0) {
    await supabase.from('repayments').update({ status: 'missed' }).in('id', rowsToMissed)
  }

  let loansEscalated = 0
  let notificationsInserted = 0

  for (const [loanId, dpd] of dpdByLoan) {
    const nextStage = stageForDaysPastDue(dpd) as DefaultStage
    if (nextStage === 0) continue

    const { data: loan } = await supabase
      .from('loans')
      .select('id, group_id, borrower_id, default_stage')
      .eq('id', loanId)
      .single()
    if (!loan) continue

    const currentStage = (loan.default_stage ?? 0) as DefaultStage
    if (nextStage <= currentStage) continue

    await supabase
      .from('loans')
      .update({
        default_stage: nextStage,
        default_stage_updated_at: new Date().toISOString(),
      })
      .eq('id', loanId)
    loansEscalated += 1

    const { data: members } = await supabase
      .from('group_members')
      .select('user_id')
      .eq('group_id', loan.group_id as string)

    const rows = (members ?? []).map((m) => ({
      user_id: m.user_id as string,
      group_id: loan.group_id as string,
      type: 'default_escalation',
      message: `A loan in your group entered stage ${nextStage} (${dpd} days past due).`,
    }))
    if (rows.length > 0) {
      await supabase.from('notifications').insert(rows)
      notificationsInserted += rows.length
    }
  }

  return Response.json({
    ok: true,
    lateMarked: rowsToLate.length,
    missedMarked: rowsToMissed.length,
    loansEscalated,
    notificationsInserted,
  })
}
```

- [ ] **Step 3: Manually verify**

Create a test repayment row with `due_date` set to 10 days ago and `status = 'pending'`, then call:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reconcile
```

Expected: response body includes `ok: true`, `lateMarked >= 1`, and the parent loan row in the `loans` table shows `default_stage = 2`. Re-running immediately should show `loansEscalated = 0` (idempotent).

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/reconcile/route.ts .env.example
git commit -m "feat(cron): reconcile overdue repayments and escalate default stages"
```

---

## Task 8: Admin resolution API for defaults

**Files:**
- Modify: `app/api/defaults/[loanId]/route.ts` (replace 501 stub)

**Interfaces:**
- Consumes: `computeLossShares` from Task 6; Supabase server client.
- Produces: `POST /api/defaults/[loanId]` accepting `{ action: 'waive' | 'partial_settle' | 'dispute', settledAmount?: number }`. Verifies the caller is the group admin, writes a `default_resolutions` row, computes `loss_amount = loan.amount - (settledAmount ?? 0)`, distributes via `computeLossShares` across all group members using `group_members.total_contributed`, inserts one `loss_distributions` row per share, and — unless `action === 'dispute'` — sets `loans.status = 'defaulted'` and `loans.default_stage = 4`. Returns `{ ok: true, resolutionId, shares }`.

- [ ] **Step 1: Replace the route**

Overwrite `app/api/defaults/[loanId]/route.ts` with:

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { computeLossShares } from '@/lib/defaults'

export const dynamic = 'force-dynamic'

type Body = {
  action: 'waive' | 'partial_settle' | 'dispute'
  settledAmount?: number
}

type Ctx = { params: Promise<{ loanId: string }> }

export async function POST(request: NextRequest, ctx: Ctx) {
  const { loanId } = await ctx.params

  const body = (await request.json().catch(() => null)) as Body | null
  if (!body) return Response.json({ ok: false, error: 'invalid_body' }, { status: 400 })

  const validActions = ['waive', 'partial_settle', 'dispute']
  if (!validActions.includes(body.action)) {
    return Response.json({ ok: false, error: 'invalid_action' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const { data: loan } = await supabase
    .from('loans')
    .select('id, group_id, amount, status, default_stage')
    .eq('id', loanId)
    .single()
  if (!loan) return Response.json({ ok: false, error: 'loan_not_found' }, { status: 404 })

  const { data: group } = await supabase
    .from('groups')
    .select('id, admin_id')
    .eq('id', loan.group_id as string)
    .single()
  if (!group) return Response.json({ ok: false, error: 'group_not_found' }, { status: 404 })
  if (group.admin_id !== user.id) {
    return Response.json({ ok: false, error: 'not_admin' }, { status: 403 })
  }

  const settled = body.action === 'partial_settle' ? Number(body.settledAmount ?? 0) : 0
  const loss = Math.max(0, Number(loan.amount) - settled)

  const { data: resolution, error: resErr } = await supabase
    .from('default_resolutions')
    .insert({
      loan_id: loanId,
      action: body.action,
      settled_amount: body.action === 'partial_settle' ? settled : null,
      loss_amount: loss,
      admin_id: user.id,
    })
    .select('id')
    .single()
  if (resErr || !resolution) {
    return Response.json({ ok: false, error: resErr?.message ?? 'insert_failed' }, { status: 500 })
  }

  const { data: members } = await supabase
    .from('group_members')
    .select('user_id, total_contributed')
    .eq('group_id', loan.group_id as string)

  const contribByMember: Record<string, number> = {}
  for (const m of members ?? []) {
    contribByMember[m.user_id as string] = Number(m.total_contributed ?? 0)
  }

  const shares = computeLossShares(loss, contribByMember)

  const distributionRows = Object.entries(shares).map(([memberId, amount]) => ({
    resolution_id: resolution.id as string,
    member_id: memberId,
    share_amount: amount,
  }))
  if (distributionRows.length > 0) {
    await supabase.from('loss_distributions').insert(distributionRows)
  }

  if (body.action !== 'dispute') {
    await supabase
      .from('loans')
      .update({ status: 'defaulted', default_stage: 4 })
      .eq('id', loanId)
  }

  return Response.json({
    ok: true,
    resolutionId: resolution.id,
    shares,
  })
}
```

- [ ] **Step 2: Manually verify (once admin page exists — verified end-to-end in Task 9)**

For now, hit the endpoint with `curl` from a logged-in browser session's cookies, or defer this smoke test to Task 9.

- [ ] **Step 3: Commit**

```bash
git add app/api/defaults/[loanId]/route.ts
git commit -m "feat(defaults): admin resolution API with loss share distribution"
```

---

## Task 9: Admin defaults page

**Files:**
- Modify: `app/(app)/groups/[groupId]/admin/defaults/page.tsx` (replace stub)
- Create: `app/(app)/groups/[groupId]/admin/defaults/default-row.tsx`
- Create: `app/(app)/groups/[groupId]/admin/defaults/defaults-actions.ts`

**Interfaces:**
- Consumes: `POST /api/defaults/[loanId]` from Task 8; Supabase server client.
- Produces: A page listing every loan in the group with `default_stage >= 1`. Per row: borrower, outstanding balance (loan.amount minus paid principal), stage badge, days in stage (from `default_stage_updated_at`), and — for stage-3 rows — Waive / Partial Settle / Dispute buttons wired to the resolution API. Only accessible to the group admin (RSC redirects non-admins to the group page).

- [ ] **Step 1: Create the server action wrapper**

Create `app/(app)/groups/[groupId]/admin/defaults/defaults-actions.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export async function resolveDefault(input: {
  groupId: string
  loanId: string
  action: 'waive' | 'partial_settle' | 'dispute'
  settledAmount?: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const cookie = h.get('cookie') ?? ''

  const res = await fetch(`${proto}://${host}/api/defaults/${input.loanId}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      cookie,
    },
    body: JSON.stringify({
      action: input.action,
      settledAmount: input.settledAmount,
    }),
  })
  const json = (await res.json().catch(() => ({}))) as
    | { ok: true }
    | { ok: false; error: string }

  if (!('ok' in json) || !json.ok) {
    return { ok: false, error: (json as any).error ?? 'request_failed' }
  }

  revalidatePath(`/groups/${input.groupId}/admin/defaults`)
  revalidatePath(`/groups/${input.groupId}`)
  return { ok: true }
}
```

- [ ] **Step 2: Create the row client component**

Create `app/(app)/groups/[groupId]/admin/defaults/default-row.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import { resolveDefault } from './defaults-actions'

export type DefaultRowData = {
  loanId: string
  borrowerName: string
  outstandingAmount: number
  stage: 1 | 2 | 3 | 4
  daysInStage: number
}

const STAGE_CLS: Record<DefaultRowData['stage'], string> = {
  1: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  2: 'border-border-warning-subtle bg-warning-soft text-fg-warning',
  3: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
  4: 'border-border-danger-subtle bg-danger-soft text-danger-strong',
}

export function DefaultRow({
  row,
  groupId,
}: {
  row: DefaultRowData
  groupId: string
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [partial, setPartial] = useState('')

  function act(action: 'waive' | 'partial_settle' | 'dispute') {
    setError(null)
    const settled = action === 'partial_settle' ? Number(partial) : undefined
    if (action === 'partial_settle' && (!settled || settled <= 0)) {
      setError('Enter a partial amount greater than 0')
      return
    }
    startTransition(async () => {
      const res = await resolveDefault({
        groupId,
        loanId: row.loanId,
        action,
        settledAmount: settled,
      })
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <li className="rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-4 shadow-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-heading">{row.borrowerName}</p>
          <p className="text-xs text-body-subtle">
            Outstanding {row.outstandingAmount.toFixed(2)} AMBPHP · {row.daysInStage} days in stage
          </p>
        </div>
        <span
          className={`rounded-full border-2 px-3 py-1 text-xs font-bold uppercase tracking-wide ${STAGE_CLS[row.stage]}`}
        >
          Stage {row.stage}
        </span>
      </div>

      {row.stage === 3 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => act('waive')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-transparent bg-brand px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-white [box-shadow:0_3px_0_var(--shadow-brand)] active:translate-y-0.5 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Waive
          </button>
          <input
            type="number"
            placeholder="Partial ₱"
            value={partial}
            onChange={(e) => setPartial(e.target.value)}
            className="w-28 rounded-lg border-2 border-border-default bg-surface px-2 py-1.5 text-xs"
          />
          <button
            type="button"
            onClick={() => act('partial_settle')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-default bg-neutral-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-body [box-shadow:0_3px_0_var(--shadow-secondary)] active:translate-y-0.5 disabled:opacity-60"
          >
            Partial Settle
          </button>
          <button
            type="button"
            onClick={() => act('dispute')}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-border-default bg-neutral-primary px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-body [box-shadow:0_3px_0_var(--shadow-secondary)] active:translate-y-0.5 disabled:opacity-60"
          >
            Dispute
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-danger-strong">{error}</p>}
    </li>
  )
}
```

- [ ] **Step 3: Replace the admin/defaults page stub**

Overwrite `app/(app)/groups/[groupId]/admin/defaults/page.tsx` with:

```tsx
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { DefaultRow, type DefaultRowData } from './default-row'

export default async function AdminDefaultsPage({
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
    .select('id, admin_id, name')
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

  const { data: loans } = await supabase
    .from('loans')
    .select('id, borrower_id, amount, default_stage, default_stage_updated_at, profiles:borrower_id(full_name)')
    .eq('group_id', groupId)
    .gte('default_stage', 1)
    .order('default_stage', { ascending: false })

  const loanIds = (loans ?? []).map((l) => l.id as string)
  const { data: paidPrincipal } = loanIds.length
    ? await supabase
        .from('repayments')
        .select('loan_id, principal')
        .eq('status', 'paid')
        .in('loan_id', loanIds)
    : { data: [] as { loan_id: string; principal: number }[] }

  const paidByLoan = new Map<string, number>()
  for (const p of paidPrincipal ?? []) {
    const cur = paidByLoan.get(p.loan_id as string) ?? 0
    paidByLoan.set(p.loan_id as string, cur + Number(p.principal ?? 0))
  }

  const rows: DefaultRowData[] = (loans ?? []).map((l: any) => {
    const paid = paidByLoan.get(l.id) ?? 0
    const outstanding = Math.max(0, Number(l.amount) - paid)
    const updatedAt = l.default_stage_updated_at
      ? new Date(l.default_stage_updated_at).getTime()
      : Date.now()
    const daysInStage = Math.max(
      0,
      Math.floor((Date.now() - updatedAt) / (1000 * 60 * 60 * 24)),
    )
    return {
      loanId: l.id,
      borrowerName: l.profiles?.full_name ?? l.borrower_id,
      outstandingAmount: outstanding,
      stage: l.default_stage as 1 | 2 | 3 | 4,
      daysInStage,
    }
  })

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Defaults — {group.name}</h1>
        <p className="text-sm text-body-subtle">
          Loans currently in a default stage. Only stage-3 loans can be resolved here.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-12 text-center shadow-xs">
          <p className="text-sm font-medium text-body-subtle">No defaulted loans.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((row) => (
            <DefaultRow key={row.loanId} row={row} groupId={groupId} />
          ))}
        </ul>
      )}
    </main>
  )
}
```

- [ ] **Step 4: End-to-end verify**

`pnpm dev`. As the admin of a group where at least one loan has `default_stage >= 1`:
1. Visit `/groups/<groupId>/admin/defaults` — the loan shows with the right stage and outstanding balance.
2. Force `default_stage = 3` on a test loan via the Supabase Table Editor.
3. Click **Waive** — the row disappears (loan status flips to `defaulted`, `default_stage = 4`) and a `default_resolutions` row + `loss_distributions` rows appear in Supabase.

- [ ] **Step 5: Commit**

```bash
git add "app/(app)/groups/[groupId]/admin/defaults"
git commit -m "feat(defaults): admin resolution UI for stage-3 loans"
```

---

# Phase C — Reminder Emails

## Task 10: Email templates + Resend send implementation

**Files:**
- Create: `lib/email-templates.ts`
- Modify: `lib/email.ts` (replace stub)
- Modify: `.env.example` (add `RESEND_FROM_EMAIL`)

**Interfaces:**
- Consumes: `resend` package (already installed); `RESEND_API_KEY`, `RESEND_FROM_EMAIL` env.
- Produces:
  - `renderTemplate(template, data): { subject, html }` — pure. Uses simple inline strings; no external template engine.
  - `sendEmail(to, template, data): Promise<{ ok: true; id: string } | { ok: false; error: string }>` — calls Resend once (no retries in this task; caller can decide).

- [ ] **Step 1: Update `.env.example`**

Append to `.env.example`:

```
RESEND_FROM_EMAIL=Ambagan <noreply@ambagan.app>
```

- [ ] **Step 2: Create the template renderer**

Create `lib/email-templates.ts`:

```ts
import type { EmailTemplate } from './email'

export function renderTemplate(
  template: EmailTemplate,
  data: Record<string, unknown>,
): { subject: string; html: string } {
  switch (template) {
    case 'contribution_reminder':
      return {
        subject: `Your ${data.groupName ?? 'Ambagan'} contribution is due`,
        html: layout(`
          <p>Hi ${escape(data.fullName ?? 'member')},</p>
          <p>Your contribution of <strong>${escape(String(data.amount ?? ''))} AMBPHP</strong> to
          <strong>${escape(String(data.groupName ?? ''))}</strong> is due on
          ${escape(String(data.dueDate ?? ''))}.</p>
          <p><a href="${escape(String(data.groupUrl ?? '#'))}">Open your group</a> to pay now.</p>
        `),
      }
    case 'repayment_reminder':
      return {
        subject: `Loan installment due — ${data.groupName ?? 'Ambagan'}`,
        html: layout(`
          <p>Hi ${escape(String(data.fullName ?? 'member'))},</p>
          <p>Installment ${escape(String(data.installmentNumber ?? ''))} of your loan
          (${escape(String(data.amount ?? ''))} AMBPHP) is due on
          ${escape(String(data.dueDate ?? ''))}.</p>
          <p><a href="${escape(String(data.repayUrl ?? '#'))}">Make payment</a>.</p>
        `),
      }
    case 'vote_opened':
      return {
        subject: `Vote requested: loan in ${data.groupName ?? 'your group'}`,
        html: layout(`
          <p>A new loan request needs your vote.</p>
          <p><a href="${escape(String(data.loansUrl ?? '#'))}">Review the request</a>.</p>
        `),
      }
    case 'loan_decision':
      return {
        subject: `Loan ${escape(String(data.outcome ?? ''))} — ${data.groupName ?? 'Ambagan'}`,
        html: layout(`
          <p>Your loan request has been ${escape(String(data.outcome ?? ''))}.</p>
          <p><a href="${escape(String(data.loanUrl ?? '#'))}">View details</a>.</p>
        `),
      }
    case 'default_escalation':
      return {
        subject: `Loan entered stage ${escape(String(data.stage ?? ''))}`,
        html: layout(`
          <p>A loan in <strong>${escape(String(data.groupName ?? ''))}</strong> has moved to
          <strong>stage ${escape(String(data.stage ?? ''))}</strong>
          (${escape(String(data.daysPastDue ?? ''))} days past due).</p>
          <p><a href="${escape(String(data.groupUrl ?? '#'))}">Open your group</a> for details.</p>
        `),
      }
  }
}

function layout(inner: string): string {
  return `<!doctype html><html><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
    <h1 style="color: #1A4731; font-size: 20px; margin: 0 0 16px;">Ambagan</h1>
    ${inner}
    <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <p style="font-size: 12px; color: #6b7280;">Sent by Ambagan · community savings on Stellar</p>
  </body></html>`
}

function escape(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
```

- [ ] **Step 3: Replace `lib/email.ts`**

Overwrite `lib/email.ts` with:

```ts
import { Resend } from 'resend'
import { renderTemplate } from './email-templates'

export type EmailTemplate =
  | 'contribution_reminder'
  | 'repayment_reminder'
  | 'vote_opened'
  | 'loan_decision'
  | 'default_escalation'

export async function sendEmail(
  to: string,
  template: EmailTemplate,
  data: Record<string, unknown>,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return { ok: false, error: 'resend_not_configured' }
  }

  const { subject, html } = renderTemplate(template, data)
  const resend = new Resend(apiKey)
  try {
    const result = await resend.emails.send({ from, to, subject, html })
    if (result.error) return { ok: false, error: result.error.message }
    return { ok: true, id: result.data?.id ?? '' }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
```

- [ ] **Step 4: Manually verify**

In a scratch server file or REPL, call `sendEmail('you@example.com', 'contribution_reminder', { fullName: 'Ana', amount: '500', groupName: 'Barangay 42', dueDate: '2026-07-10', groupUrl: 'https://example.com' })`. Confirm the email lands in the target inbox.

- [ ] **Step 5: Commit**

```bash
git add lib/email.ts lib/email-templates.ts .env.example
git commit -m "feat(email): implement Resend send with typed templates"
```

---

## Task 11: Reminders cron — daily sweep

**Files:**
- Modify: `app/api/cron/reminders/route.ts` (replace 501 stub)

**Interfaces:**
- Consumes: `sendEmail` from Task 10; Supabase server client; `CRON_SECRET`, `APP_URL` env.
- Produces: `GET` endpoint (bearer-authed) that:
  1. Finds every `contributions` row with `status = 'pending'` and `due_date` within 3 days (past or future) or on the current day, joins to the borrower's email via `auth.users`, and sends `contribution_reminder`.
  2. Finds every `repayments` row with `status = 'pending'` and `due_date` in the next 3 days, joins to the borrower via the loan, and sends `repayment_reminder`.
  Inserts one `notifications` row per email sent so the in-app feed matches.

- [ ] **Step 1: Add `APP_URL` to `.env.example`**

Append to `.env.example`:

```
APP_URL=http://localhost:3000
```

- [ ] **Step 2: Replace the reminders route**

Overwrite `app/api/cron/reminders/route.ts` with:

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

function daysBetween(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const expected = process.env.CRON_SECRET
  if (!expected || auth !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
  const supabase = await createClient()
  const today = new Date()

  const inRange = (dueIso: string) => {
    const due = new Date(dueIso)
    const delta = daysBetween(due, today)
    return delta >= 0 && delta <= 3
  }

  let contributionEmails = 0
  let repaymentEmails = 0
  const notifRows: Array<{
    user_id: string
    group_id: string | null
    type: string
    message: string
  }> = []

  // Contributions
  const { data: contribs } = await supabase
    .from('contributions')
    .select('id, user_id, group_id, amount, due_date, status, groups(name), profiles:user_id(full_name)')
    .eq('status', 'pending')

  for (const c of contribs ?? []) {
    if (!inRange(c.due_date as string)) continue
    const { data: authUser } = await supabase.auth.admin.getUserById(c.user_id as string)
    const email = authUser.user?.email
    if (!email) continue

    await sendEmail(email, 'contribution_reminder', {
      fullName: (c as any).profiles?.full_name,
      amount: c.amount,
      groupName: (c as any).groups?.name,
      dueDate: c.due_date,
      groupUrl: `${appUrl}/groups/${c.group_id}`,
    })
    contributionEmails += 1
    notifRows.push({
      user_id: c.user_id as string,
      group_id: c.group_id as string,
      type: 'contribution_reminder',
      message: `Your contribution of ${c.amount} AMBPHP is due ${c.due_date}.`,
    })
  }

  // Repayments
  const { data: repays } = await supabase
    .from('repayments')
    .select('id, loan_id, installment_number, amount_due, due_date, status, loans:loan_id(borrower_id, group_id, groups(name))')
    .eq('status', 'pending')

  for (const r of repays ?? []) {
    if (!inRange(r.due_date as string)) continue
    const borrowerId = (r as any).loans?.borrower_id as string | undefined
    const groupId = (r as any).loans?.group_id as string | undefined
    const groupName = (r as any).loans?.groups?.name as string | undefined
    if (!borrowerId || !groupId) continue

    const { data: authUser } = await supabase.auth.admin.getUserById(borrowerId)
    const email = authUser.user?.email
    if (!email) continue

    await sendEmail(email, 'repayment_reminder', {
      installmentNumber: r.installment_number,
      amount: r.amount_due,
      groupName,
      dueDate: r.due_date,
      repayUrl: `${appUrl}/groups/${groupId}/repayments`,
    })
    repaymentEmails += 1
    notifRows.push({
      user_id: borrowerId,
      group_id: groupId,
      type: 'repayment_reminder',
      message: `Installment ${r.installment_number} (${r.amount_due} AMBPHP) is due ${r.due_date}.`,
    })
  }

  if (notifRows.length > 0) {
    await supabase.from('notifications').insert(notifRows)
  }

  return Response.json({
    ok: true,
    contributionEmails,
    repaymentEmails,
    notificationsInserted: notifRows.length,
  })
}
```

- [ ] **Step 3: Manually verify**

Seed a contribution row with `due_date = today + 1 day` and `status = 'pending'`. Call:

```bash
curl -s -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

Expected: response reports `contributionEmails >= 1`; the target inbox receives the email; a `notifications` row appears in Supabase.

- [ ] **Step 4: Commit**

```bash
git add app/api/cron/reminders/route.ts .env.example
git commit -m "feat(cron): send daily contribution/repayment reminders via Resend"
```

---

# Phase D — Ledger Export

## Task 12: CSV export API route

**Files:**
- Modify: `app/api/groups/[groupId]/export/route.ts` (replace 501 stub)

**Interfaces:**
- Consumes: `getAccountPayments` from `lib/stellar.ts`; Supabase server client.
- Produces: `GET /api/groups/[groupId]/export` returning a CSV attachment with columns: `timestamp, tx_hash, direction, amount_ambphp, type, counterparty_name, counterparty_account`. Only group members can call it.

- [ ] **Step 1: Replace the route**

Overwrite `app/api/groups/[groupId]/export/route.ts` with:

```ts
import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getAccountPayments } from '@/lib/stellar'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ groupId: string }> }

export async function GET(_request: NextRequest, ctx: Ctx) {
  const { groupId } = await ctx.params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('unauthorized', { status: 401 })
  }

  const { data: membership } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return new Response('forbidden', { status: 403 })

  const { data: group } = await supabase
    .from('groups')
    .select('id, name, stellar_account_id')
    .eq('id', groupId)
    .single()
  if (!group?.stellar_account_id) {
    return new Response('group_not_provisioned', { status: 400 })
  }

  const groupAccount = group.stellar_account_id
  const payments = await getAccountPayments(groupAccount, 200)
  const ambphp = payments.filter(
    (p: any) =>
      p.type === 'payment' &&
      p.asset_type !== 'native' &&
      p.asset_code === 'AMBPHP',
  )
  const txHashes = ambphp.map((p: any) => p.transaction_hash)

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

  const meta = new Map<string, { type: string; counterparty?: string }>()
  for (const c of contribHits.data ?? []) {
    meta.set(c.stellar_tx_hash as string, {
      type: 'contribution',
      counterparty: (c as any).profiles?.full_name,
    })
  }
  for (const l of loanHits.data ?? []) {
    meta.set(l.stellar_tx_hash as string, {
      type: 'disbursement',
      counterparty: (l as any).profiles?.full_name,
    })
  }
  for (const r of repayHits.data ?? []) {
    meta.set(r.stellar_tx_hash as string, {
      type: 'repayment',
      counterparty: (r as any).loans?.profiles?.full_name,
    })
  }

  const header =
    'timestamp,tx_hash,direction,amount_ambphp,type,counterparty_name,counterparty_account'
  const lines = [header]
  for (const p of ambphp) {
    const info = meta.get(p.transaction_hash) ?? { type: 'other' }
    const direction = p.to === groupAccount ? 'in' : 'out'
    const counterAccount = direction === 'in' ? p.from : p.to
    lines.push(
      [
        p.created_at,
        p.transaction_hash,
        direction,
        Number(p.amount).toFixed(4),
        info.type,
        csvEscape(info.counterparty ?? ''),
        counterAccount,
      ].join(','),
    )
  }

  const body = lines.join('\n')
  const safeName = group.name.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 40)
  const filename = `ambagan-${safeName}-ledger.csv`

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
    },
  })
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return `"${v.replace(/"/g, '""')}"`
  }
  return v
}
```

- [ ] **Step 2: Manually verify**

`pnpm dev`, log in as a group member, then in a browser tab open:

```
http://localhost:3000/api/groups/<groupId>/export
```

Expected: browser downloads `ambagan-<groupname>-ledger.csv` with one row per AMBPHP payment on the group account.

- [ ] **Step 3: Commit**

```bash
git add app/api/groups/[groupId]/export/route.ts
git commit -m "feat(export): CSV ledger export for group members"
```

---

## Task 13: Admin export page

**Files:**
- Modify: `app/(app)/groups/[groupId]/admin/export/page.tsx` (replace stub)

**Interfaces:**
- Consumes: `GET /api/groups/[groupId]/export` from Task 12.
- Produces: A one-button admin page that links to the CSV endpoint. Only accessible to the group admin (RSC redirect).

- [ ] **Step 1: Replace the admin/export stub**

Overwrite `app/(app)/groups/[groupId]/admin/export/page.tsx` with:

```tsx
export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Download } from 'lucide-react'

export default async function AdminExportPage({
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
    .select('id, name, admin_id')
    .eq('id', groupId)
    .single()
  if (!group) redirect('/dashboard')
  if (group.admin_id !== user.id) redirect(`/groups/${groupId}`)

  return (
    <main className="mx-auto w-full max-w-2xl p-6 md:p-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-heading">Export ledger — {group.name}</h1>
        <p className="text-sm text-body-subtle">
          Download every AMBPHP movement on this group's Stellar account as a CSV file.
        </p>
      </div>

      <div className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
        <p className="mb-4 text-sm text-body">
          The export includes contributions, disbursements, repayments, and any other AMBPHP payment on the group account, straight from Stellar.
        </p>
        <Link
          href={`/api/groups/${groupId}/export`}
          className="inline-flex items-center gap-2 rounded-xl border-2 border-transparent bg-brand px-5 py-3 text-sm font-bold uppercase tracking-wide text-white [box-shadow:0_4px_0_var(--shadow-brand)] active:translate-y-0.5"
        >
          <Download className="h-4 w-4" />
          Download CSV
        </Link>
      </div>
    </main>
  )
}
```

- [ ] **Step 2: Manually verify**

As group admin, visit `/groups/<groupId>/admin/export`, click **Download CSV** — file downloads.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/groups/[groupId]/admin/export/page.tsx"
git commit -m "feat(export): admin trigger page for CSV ledger download"
```

---

## Self-Review Notes

- **Spec coverage:**
  - Credit score (FR-CR-01 inputs, FR-CR-03 letter grade on loan cards) → Tasks 2, 4.
  - Score recompute on contribution/repayment → Task 5.
  - `/profile` credit view (SRS §12) → Task 5.
  - 4-stage default state machine + loss share (SRS §8) → Tasks 6–9.
  - `POST /api/defaults/[loanId]` (admin resolution) → Task 8.
  - `GET /api/cron/reconcile` (SRS §7, D8) → Task 7.
  - `GET /api/cron/reminders` (FR-CS-02, FR-LR-05) → Task 11.
  - `sendEmail` via Resend (§8 notification model) → Task 10.
  - `GET /api/groups/[groupId]/export` CSV → Task 12; admin trigger UI → Task 13.

- **Type consistency check:**
  - `CreditInputs` shape identical in Task 2 signature, Task 2 tests, Task 3 builder, and Task 5 profile page.
  - `DefaultStage` type identical in Task 6 signature, Task 7 reconciler, Task 8 API stage transitions.
  - `EmailTemplate` union identical in Task 10 `email.ts` and `email-templates.ts`.
  - `resolveDefault` server action returns `{ ok } | { ok: false; error }` — Task 9 row consumes the same shape.

- **Placeholder scan:** no TODOs, no "similar to task N," no unnamed helpers. Every code step ships runnable code.

- **Deviations from spec called out:**
  - Default handling is backend-only (no Soroban call in `POST /api/defaults/[loanId]`) — matches the Phase-6 deviation.
  - Reminder cron does not implement Resend's exponential-backoff retry from NFR 5.3 — one attempt per row; retries can be added later if the demo shows delivery failures.
  - Export is CSV only; PDF is out of scope for the hackathon window.
