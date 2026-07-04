# Ambagan Architecture Design

**Version:** 1.0
**Date:** 2026-07-04
**Author:** Gabrielle (with Claude)
**Source SRS:** `Ambagan_SRS_v1.docx` v1.0
**Target milestone:** APAC Stellar Hackathon 2026 — demo by July 15, 2026

---

## 1. Purpose

This document defines the architecture, screen inventory, folder layout, data model, and Stellar integration boundary for the Ambagan MVP. It is the design contract that the implementation plan will be written against.

Scope is limited to the initial hackathon release. Out-of-scope items are enumerated at the end.

## 2. Decisions Locked In

The following decisions were made during brainstorming and are treated as fixed inputs to the implementation plan.

| # | Decision | Value |
|---|---|---|
| D1 | Backend stack | Next.js (App Router) with server actions + API route handlers. No separate NestJS service. |
| D2 | Auth + database | Supabase (auth, Postgres, Realtime, RLS) |
| D3 | Email | Resend |
| D4 | Blockchain | Stellar testnet + Soroban (Rust contracts) |
| D5 | Wallet model | Custodial by default (encrypted keys in Supabase). Freighter opt-in supported. |
| D6 | Demo scope | Full lifecycle: contribute → vote → disburse → repay → interest distribution |
| D7 | Default handling scope | Full 4-stage system with Soroban `default-state` contract |
| D8 | On-chain reads | Write-through cache in Supabase, reconciled periodically from Horizon |
| D9 | Code organization | Flat single-app Next.js layout (no `web/` wrapper, no `features/` folder for MVP) |
| D10 | Screen inventory | 16 screens (see §5), plus `/onboarding/wallet` restored for Freighter opt-in |

## 3. High-Level Architecture

Three layers with the Stellar network as the source of truth for financial state, Supabase as a write-through cache plus off-chain metadata store, and Next.js as both UI and server-side orchestration.

```
┌────────────────────────────────────────────────────────────┐
│  Next.js App (App Router, RSC + Server Actions)            │
│                                                            │
│  ┌────────────┐   ┌──────────────┐   ┌──────────────────┐  │
│  │  UI (RSC)  │──▶│Server Actions│──▶│  lib/ platform   │  │
│  └────────────┘   └──────────────┘   └───────┬──────────┘  │
│                                              │             │
│                        ┌─────────────────────┼──────────┐  │
│                        ▼                     ▼          ▼  │
│                  lib/stellar          lib/supabase   lib/email
└────────────┬───────────┬────────────────────┬──────────────┘
             │           │                    │
             ▼           ▼                    ▼
     ┌─────────────┐ ┌────────────┐   ┌──────────────┐
     │  Stellar    │ │  Supabase  │   │   Resend     │
     │  Horizon +  │ │  Postgres  │   │   (email)    │
     │  Soroban    │ │  + Auth    │   └──────────────┘
     │  Testnet    │ │  + Realtime│
     └─────────────┘ └────────────┘
```

### 3.1 Rules of the Road

1. **Stellar is authoritative for money.** Every balance-changing operation lands on-chain first, then is mirrored to Supabase with the transaction hash. Supabase never invents financial state.
2. **Server actions are the only place secret keys touch memory.** Custodial keys are decrypted inside a server action, used to build and sign a transaction, and dropped. Client code never sees a secret.
3. **RSC-first reads.** Ledger, dashboard, and group views are React Server Components reading from Supabase directly. Client components are used only where interactivity demands them (vote buttons, forms, live counters).
4. **Realtime for live state.** Supabase Realtime channels drive the vote counter, contribution status board, and "someone just signed" notifications during an active loan vote. No polling in the UI.
5. **A single reconciler** (`/api/cron/reconcile`) sweeps Horizon periodically to catch on-chain events the app did not originate (for example, an interest distribution triggered by a Soroban contract), keeping the cache honest.
6. **Soroban contracts** are used for: interest distribution, contribution accounting metadata, and the default state machine. Contract IDs are stored per group in Supabase.

### 3.2 Trust Boundaries

| Layer | Trust | Can hold secrets? | Can sign? |
|---|---|---|---|
| Client components (`"use client"`) | Untrusted | No | No |
| Server components + server actions + API routes | Trusted | Yes | Yes |
| Soroban contracts | Trustless (publicly verifiable) | No | N/A |

## 4. Folder Structure

```
ambagan/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                        # Landing
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── invite/[token]/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                      # Auth guard
│   │   ├── onboarding/
│   │   │   └── wallet/page.tsx             # Custodial vs Freighter
│   │   ├── dashboard/page.tsx
│   │   ├── groups/
│   │   │   ├── new/page.tsx
│   │   │   └── [groupId]/
│   │   │       ├── page.tsx                # Overview
│   │   │       ├── ledger/page.tsx
│   │   │       ├── loans/
│   │   │       │   ├── page.tsx            # Marketplace
│   │   │       │   └── request/page.tsx
│   │   │       ├── repayments/page.tsx
│   │   │       └── admin/
│   │   │           ├── page.tsx            # Settings + invite
│   │   │           ├── defaults/page.tsx
│   │   │           └── export/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── groups/[groupId]/
│       │   ├── invite/route.ts
│       │   └── export/route.ts
│       ├── contributions/route.ts
│       ├── loans/[loanId]/
│       │   ├── vote/route.ts
│       │   └── repay/route.ts
│       ├── defaults/[loanId]/route.ts
│       ├── stellar/account/route.ts
│       └── cron/
│           ├── reminders/route.ts
│           └── reconcile/route.ts
│
├── components/
│   ├── ui/                                 # shadcn primitives
│   ├── group/                              # Fund balance, member list, cycle status, goal progress
│   ├── loans/                              # Loan card, vote UI, request form, repayment calendar
│   ├── ledger/                             # Table, filters, tx-hash links
│   └── shared/                             # Empty states, confirmation dialogs, tx previews
│
├── lib/
│   ├── stellar.ts                          # SDK client, keypair, encrypt/decrypt, tx builders
│   ├── soroban.ts                          # Contract deploy + invoke helpers
│   ├── email.ts                            # Resend + templates
│   ├── credit.ts                           # Score calculator
│   └── defaults.ts                         # Stage-machine helpers
│
├── utils/supabase/                         # client.ts, server.ts
│
├── contracts/                              # Soroban Rust contracts
│   ├── interest-distribution/
│   ├── contribution-accounting/
│   └── default-state/
│
├── middleware.ts                           # Auth guard
├── docs/superpowers/specs/                 # This file lives here
└── package.json
```

## 5. Screen Inventory

Sixteen screens plus `/onboarding/wallet` for the Freighter opt-in path. Grouped by area.

### 5.1 Public (unauthenticated)

| # | Route | Purpose | SRS ref |
|---|---|---|---|
| 1 | `/` | Landing. Hero, value proposition, "Join a Group" CTA prompting for an invite link. No public sign-up button, no group discovery. | 1.3, §9 |
| 2 | `/register` | Full name, email, password. On submit: Supabase creates auth user, trigger creates profile, server provisions custodial Stellar keypair, encrypts secret, stores public key on profile. Redirects to `/onboarding/wallet`. | FR-GM-03, 7.1 |
| 3 | `/login` | Email + password. Redirects to `/dashboard`. | 5.2 |
| 4 | `/invite/[token]` | Validates invite token; shows group name + description; prompts sign-up or login; adds user as group member; redirects to group overview. | FR-GM-02, FR-GM-03 |

### 5.2 Onboarding (authenticated)

| # | Route | Purpose | SRS ref |
|---|---|---|---|
| — | `/onboarding/wallet` | First-run wallet setup. Custodial (recommended, default) vs Freighter. If Freighter is chosen, prompts extension connection and replaces the custodial public key. | 7.1 |

### 5.3 Member

| # | Route | Purpose | SRS ref |
|---|---|---|---|
| 5 | `/dashboard` | Groups the user belongs to as cards: name, pool balance, current-cycle contribution status, count of open loan votes. Empty state offers "Create a Group" and "Join via Invite". | 3.2 |
| 6 | `/groups/new` | Create group. Inputs: name, description, contribution amount, cadence, interest rate (within ceiling), vote threshold (majority / two-thirds / unanimous), optional savings goal. Provisions group Stellar multi-sig account. | FR-GM-01 |
| 7 | `/groups/[groupId]` | Group overview: fund pool balance (live from Stellar), savings goal progress bar, member list with current-cycle status icons, fund-growth chart. Tabs to Ledger, Loans, Repayments, Admin (admin-only). | FR-CS-03, FR-CS-05 |
| 8 | `/groups/[groupId]/ledger` | Chronological, filterable transaction log. Type, amount, member, timestamp, link to Stellar explorer. Filters: type, date range. | FR-LT-01, FR-LT-02 |
| 9 | `/groups/[groupId]/loans` | Loan marketplace. Cards per open request: borrower, purpose tag, amount, description, credit letter grade, live vote tally, time remaining. Approve/Deny buttons. Closed loans in a separate tab. | FR-LR-01–FR-LR-03, FR-CR-03 |
| 10 | `/groups/[groupId]/loans/request` | Loan request form. Amount (validated against member ceiling), purpose tag, description, repayment months. Live repayment-schedule preview before submit. | FR-LR-01, FR-CR-02 |
| 11 | `/groups/[groupId]/repayments` | Full repayment calendar for the member's active loan(s). Each installment: due date, principal, interest, status. "Make Payment" button on the current installment. | FR-LR-05 |
| 12 | `/profile` | Credit score with visual indicator, contribution streak with milestone badges, total contributed across groups, total interest earned, full loan history. | FR-CS-04, FR-CR-01, FR-CR-03, FR-LT-03 |

### 5.4 Admin (group administrator only)

| # | Route | Purpose | SRS ref |
|---|---|---|---|
| 13 | `/groups/[groupId]/admin` | Group settings (contribution amount, cadence, interest rate, threshold, savings goal), invite link (copy + revoke), member list. Cosmetic edits (name, description, goal) apply immediately. Financial-parameter edits (contribution amount, cadence, interest rate) trigger a majority-vote proposal before taking effect. | FR-GM-02, FR-GM-04 |
| 14 | `/groups/[groupId]/admin/defaults` | Loans currently in a default stage. Per entry: borrower, outstanding amount, current stage (1–4), days in stage. Stage 3 shows Waive / Partial Settle / Dispute buttons. Stage 2 shows extension request status. | §8 |
| 15 | `/groups/[groupId]/admin/export` | Export ledger. Choose format (PDF, CSV), optional date range, download. PDF formatted as treasury report. | FR-GM-05 |

### 5.5 Shared

| # | Route | Purpose | SRS ref |
|---|---|---|---|
| 16 | `/notifications` | Chronological alerts: contribution due, vote opened, loan approved, disbursement, repayment reminder, default escalation. Timestamped, deep-linked. | FR-CS-02, FR-LR-05 |
| 17 | `/settings` | Account details (name, email, password), wallet mode toggle (Custodial vs Freighter), email notification preferences per event type. | 3.2, 7.1 |

### 5.6 Utility Routes (not screens)

- `POST /api/stellar/account` — custodial keypair provisioning
- `POST /api/contributions` — submit a contribution
- `POST /api/loans/[loanId]/vote` — cast a vote (attaches signature)
- `POST /api/loans/[loanId]/repay` — submit a repayment installment
- `POST /api/defaults/[loanId]` — record default state transitions and resolutions
- `POST /api/groups/[groupId]/invite` — issue or revoke invite
- `GET  /api/groups/[groupId]/export` — stream PDF or CSV
- `GET  /api/cron/reminders` — daily reminders for contributions, repayments, defaults
- `GET  /api/cron/reconcile` — periodic Horizon sweep to reconcile the cache

### 5.7 Deliberately Excluded (per SRS §9)

Public group discovery, cross-group transfers, SMS preferences, co-admin management, fiat on/off-ramp, native mobile.

## 6. Data Model

Supabase Postgres schema. RLS enabled on every table; policies follow the pattern "visible to members of the referenced group".

### 6.1 Base Schema (as provided in the setup guide)

- `profiles(id, full_name, stellar_public_key, stellar_secret_encrypted, is_custodial, credit_score, created_at)`
- `groups(id, name, description, stellar_account_id, stellar_secret_encrypted, contribution_amount, cadence, interest_rate, vote_threshold, admin_id, invite_token, invite_active, savings_goal_name, savings_goal_amount, savings_goal_date, created_at)`
- `group_members(id, group_id, user_id, joined_at, contribution_streak, total_contributed, total_interest_earned)`
- `contributions(id, group_id, user_id, amount, cycle_number, stellar_tx_hash, status, due_date, paid_at, created_at)`
- `loans(id, group_id, borrower_id, amount, interest_rate, purpose_tag, description, repayment_months, status, stellar_tx_hash, default_stage, approved_at, disbursed_at, voting_closes_at, created_at)` — `voting_closes_at` = `created_at + 72h` per FR-LR-02
- `votes(id, loan_id, voter_id, vote, stellar_signature, created_at)`
- `repayments(id, loan_id, installment_number, amount_due, principal, interest, due_date, paid_at, stellar_tx_hash, status)`
- `notifications(id, user_id, group_id, type, message, read, created_at)`

Auto-profile creation on signup via `handle_new_user()` trigger.

### 6.2 Additions Required for Locked Scope

Full lifecycle + 4-stage defaults require these tables and columns beyond the base schema.

**`extension_requests`** — Stage 2 extension voting (SRS §8.1)
```sql
create table public.extension_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  reason text not null,
  proposed_due_date date not null,
  status text not null default 'voting'
    check (status in ('voting','approved','denied','expired')),
  voting_closes_at timestamptz not null,
  created_at timestamptz default now()
);
alter table public.votes
  add column extension_id uuid references public.extension_requests(id);
```

Extension votes reuse the existing `votes` table via a nullable `extension_id` column. `votes.loan_id` is also made nullable, and a check constraint enforces that exactly one of (`loan_id`, `extension_id`) is set per row. This lets a single votes table serve both loan approval and extension approval flows without duplicating vote-collection code.

```sql
alter table public.votes alter column loan_id drop not null;
alter table public.votes
  add constraint votes_target_check
  check ((loan_id is not null)::int + (extension_id is not null)::int = 1);
```

**`default_resolutions`** — Stage 3 admin actions (SRS §8.2)
```sql
create table public.default_resolutions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  action text not null check (action in ('waive','partial_settle','dispute')),
  settled_amount numeric,
  loss_amount numeric not null,
  admin_id uuid references public.profiles(id) not null,
  soroban_tx_hash text,
  created_at timestamptz default now()
);
```

**`loss_distributions`** — Stage 4 per-member share of absorbed loss (SRS §8.3)
```sql
create table public.loss_distributions (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid references public.default_resolutions(id) on delete cascade not null,
  member_id uuid references public.profiles(id) not null,
  share_amount numeric not null,
  created_at timestamptz default now()
);
```

**`interest_distributions`** — history of Soroban interest payouts (FR-LR-06)
```sql
create table public.interest_distributions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  member_id uuid references public.profiles(id) not null,
  amount numeric not null,
  soroban_tx_hash text not null,
  created_at timestamptz default now()
);
```

**Group Soroban contract IDs**
```sql
alter table public.groups
  add column interest_contract_id text,
  add column contribution_contract_id text,
  add column default_contract_id text;
```

RLS on the additions extends the existing "visible to group members" pattern through the loan the row belongs to.

## 7. Stellar Integration Boundary

All Stellar SDK calls are encapsulated in `lib/stellar.ts` and `lib/soroban.ts` (NFR 5.5). Contracts live under `contracts/` in Rust.

| Operation | Where | Signing | On-chain artefact |
|---|---|---|---|
| Create user Stellar account | `POST /api/stellar/account` | Server signs with issuer; Friendbot funds on testnet | User account |
| Create group multi-sig account | Server action on group creation | Server signs the account creation and initial `SetOptions`. Group master weight is set below threshold so it cannot move funds alone (SRS §7.2). Member signer weights are added incrementally as members join (see next row). | Group account with multisig configured |
| Add member as group signer | Server action on member join | Server submits `SetOptions` adding the new member's public key as an additional signer with the per-member weight defined by the group's vote threshold | Signer added to group account |
| Submit contribution | Server action | Custodial: server decrypts + signs. Freighter: browser signs, server submits. | Payment tx from member to group account |
| Submit vote (loan or extension) | Server action | For approve votes: the member signs the pending disbursement transaction envelope; the signature is captured and stored on `votes.stellar_signature`. For deny votes: no signature is captured, only the vote row. | No on-chain artefact until threshold met |
| Disburse loan | Server action, triggered when threshold met | Multisig tx assembled from collected signatures, submitted to Horizon | Payment tx from group to borrower |
| Repay installment | Server action | Same as contribution | Payment tx from borrower to group |
| Distribute interest | Soroban `interest-distribution`, invoked by server on repayment | Contract computes and pays out on-chain | Multiple payment ops from group to members |
| Record default state transition | Soroban `default-state`, invoked by server on stage change | Contract logs state immutably | Contract event |
| Absorb loss (waive / partial settle) | Soroban `default-state` + server | Contract records loss; server writes `loss_distributions` rows | Contract event |
| Reconciliation | `GET /api/cron/reconcile` | Sweeps Horizon for txs the app did not originate; writes missed rows | None (read-only) |

**Invariant enforced in `lib/stellar.ts`:** the client never sees a secret key or an unsigned transaction it can tamper with. Every signing decision goes through a server action that re-verifies the caller's intent (session user matches the acting principal, amount matches the confirmed amount, target account matches).

## 8. Notification Model

| Trigger | Channel | Timing | SRS ref |
|---|---|---|---|
| Contribution reminder | Email + in-app | T-3d, T-0, T+3d | FR-CS-02 |
| Repayment reminder | Email + in-app | T-3d before each installment | FR-LR-05 |
| Vote opened | Email + in-app | On loan or extension request submission | FR-LR-02 |
| Loan approved / denied | Email + in-app | On vote threshold met or voting window close | FR-LR-03 |
| Disbursement received | In-app | On disbursement tx confirmation | FR-LR-04 |
| Interest distributed | In-app | On Soroban contract execution | FR-LR-06 |
| Default escalation | Email + in-app | On Stage 1/2/3 transition | §8 |

Email delivery via Resend with three-attempt exponential backoff (NFR 5.3). In-app notifications are Supabase Realtime-driven inserts into `notifications`.

## 9. Non-Functional Compliance Notes

| NFR | How it is met |
|---|---|
| 5.1 Performance | RSC + Supabase reads for primary views; realtime subscriptions replace polling for live counters. |
| 5.2 Security | HTTPS enforced by hosting; Supabase manages password hashing; custodial keys encrypted at rest with AES using `ENCRYPTION_SECRET`; server actions decrypt only in memory. |
| 5.3 Reliability | Reconciler catches missed on-chain events; Resend retries on delivery failure. |
| 5.4 Usability | Filipino-language UX copy; explicit confirmation dialogs on contributions, votes, disbursements. |
| 5.5 Maintainability | Stellar SDK usage confined to `lib/stellar.ts` and `lib/soroban.ts` so testnet/mainnet migration is a config change. |
| 5.6 Compliance | Invite-only groups (no discovery UI), no public advertising of lending, RLS enforces data confidentiality. |

## 10. Out of Scope

Per SRS §9: public group discovery, cross-group transfers, native mobile (Expo), real fiat integration, SMS notifications, cooperative registration workflow, investment or yield products, multi-administrator groups.

## 11. Open Follow-Ups (Not Blocking Implementation)

- **PDF export renderer** — library choice deferred to implementation (candidates: `@react-pdf/renderer`, `pdfmake`). Decide during the `admin/export` build.
- **Encryption key rotation** — MVP uses a single `ENCRYPTION_SECRET`. Rotation strategy is post-MVP.
- **Rate limiting on auth endpoints (NFR 5.2)** — Supabase provides some at the platform level; per-endpoint tuning is deferred.

## 12. References

- `Ambagan_SRS_v1.docx` v1.0
- Stellar Developer Docs: https://developers.stellar.org/
- Supabase docs: https://supabase.com/docs
- Next.js App Router docs: https://nextjs.org/docs/app
