# Ambagan

A community savings and lending platform that modernizes the traditional Filipino *paluwagan* — a rotating savings circle where members pool money, take turns receiving the pot, and support each other through democratically approved loans. Ambagan puts this on-chain using the Stellar network for transparent, programmable fund management.

Built for the Stellar Hackathon.

**Live:** [ambagan.site](https://ambagan.site)

---

## What It Does

Members form groups, contribute regularly to a shared fund, and vote to approve loan requests from within the community. Every peso deposited and every loan disbursed is recorded as an on-chain Stellar transaction using a custom asset (AMBPHP). Groups end cycles by distributing the accumulated fund back to members in proportion to what they contributed.

Core capabilities:

- **Groups** — create a savings circle with configurable contribution amount, cadence (weekly/biweekly/monthly), interest rate, and vote threshold
- **Contributions** — members send AMBPHP to the group's Stellar account on schedule; the app tracks on-time, late, and missed payments
- **Loans** — any member can request a loan up to half the group's current balance; other members vote to approve or deny within a 48-hour window
- **Disbursement** — once a loan clears the vote threshold, AMBPHP is sent on-chain to the borrower in the same server action that records the final vote
- **Repayments** — a flat amortization schedule is generated at request time; each installment is tracked independently
- **Distributions** — at cycle end, the admin triggers a payout that splits the pot proportionally across all members in a single Stellar transaction
- **Credit scores** — each member has a 0–1000 score (letter grade A–F) derived from contribution history and loan repayment behavior
- **Notifications** — in-app feed for votes, contributions, disbursements, and reminders
- **Invite links** — admins share a UUID token link; unauthenticated visitors are redirected to sign in first, then land on the join page after auth

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Database & Auth | Supabase (Postgres + RLS + Realtime) |
| Blockchain | Stellar Testnet — custom AMBPHP asset |
| Styling | Tailwind CSS + custom design system (Forest & Gold) |
| Email | Resend |
| Testing | Vitest |
| Deployment | Vercel |

---

## Architecture

### Route Groups

```
app/
├── (public)/           # Landing page, login, register, invite accept, auth callbacks
└── (app)/              # Authenticated shell — sidebar nav, dashboard, groups
    ├── dashboard/      # Overview: stats, alerts, communities, activity feed
    ├── groups/
    │   ├── new/        # Group creation form
    │   └── [groupId]/
    │       ├── page.tsx        # Group home: balance, members, contribute
    │       ├── loans/          # Loan list + voting cards
    │       ├── repayments/     # Repayment schedule per member
    │       ├── ledger/         # On-chain payment history
    │       └── admin/          # Settings, member management, cycle end, defaults
    ├── settings/       # Account, password, sign-out
    ├── notifications/  # Full notification list
    └── onboarding/wallet/  # Stellar wallet provisioning on first login
```

### Data Access Pattern

All pages are server components that fetch directly in the RSC render. Server Actions handle mutations. Two Supabase clients are used:

- **`createClient()`** (cookie-based, respects RLS) — for all user-scoped reads and member-initiated writes
- **`createAdminClient()`** (service role key, bypasses RLS) — for system-level operations that RLS would incorrectly block: inserting repayment schedules, reading member counts for vote threshold calculation, reading profiles across groups

This distinction matters because Supabase RLS on `profiles` only allows a user to read their own row. Any cross-member profile lookups (borrower names on loan cards, member lists in admin) must go through the admin client.

### Stellar Integration (`lib/stellar.ts`)

Each entity gets its own Stellar keypair:

- **User wallet** — provisioned on first login via `/onboarding/wallet`; the user's public key is stored on their profile; the encrypted secret is stored server-side
- **Group fund account** — provisioned at group creation; funded via Friendbot (testnet), trustline to AMBPHP established, multisig configured with the admin as first signer

Group accounts use Stellar multisig. When a member joins, their public key is added as a signer with weight 1 and the threshold is updated. Loan disbursement collects enough signer secrets from approvers to meet the on-chain threshold.

Stellar API calls are cached per-public-key for 30 seconds using `next/cache` `unstable_cache` to avoid hammering Horizon on every page load. The Horizon client is a module-level singleton to avoid recreating the HTTP connection pool on every request.

---

## Key Flows

### 1. Registration & Wallet Provisioning

```
Register → email confirmed → profile row auto-created (DB trigger)
→ /onboarding/wallet → Stellar keypair generated server-side
→ Friendbot funds testnet account → AMBPHP trustline established
→ public key saved to profile, encrypted secret stored server-side
```

### 2. Group Creation

```
Fill form (name, cadence, contribution amount, interest rate, vote threshold)
→ groups row inserted
→ Stellar keypair generated for the group fund
→ Friendbot funds group account → AMBPHP trustline → multisig configured
→ group.stellar_account_id + encrypted secret persisted
→ creator inserted as first group_member
→ redirect to group page
```

If any Stellar step fails, the groups row is deleted so the user can retry cleanly.

### 3. Joining via Invite

```
Admin copies invite link (https://ambagan.site/invite/<token>)
→ recipient opens link → if not logged in, redirect to /login?invite=<token>
→ after login, redirect back to /invite/<token>
→ join button calls server action → group_members row inserted
→ member's Stellar public key added as on-chain signer → threshold updated
→ redirect to group dashboard
```

The invite token is a UUID stored on the `groups` row. Admins can toggle invite links active/inactive from the admin panel.

### 4. Contributions

```
Member opens group page → ContributeButton shows amount due
→ server action: contributions row inserted (pending)
→ AMBPHP payment sent from member's account to group account
→ contribution status updated to confirmed
→ group_members.total_contributed incremented
→ notification created for group
```

### 5. Loan Request & Voting

```
Member fills loan request form (amount, purpose, description, repayment months)
→ live repayment schedule preview calculated client-side
→ requestLoan server action:
    - loans row inserted (status: voting, voting_closes_at: +48h)
    - repayment schedule computed → repayments rows inserted via admin client
→ loan appears on /loans page for all members

Other members see Approve / Deny buttons on the LoanCard
→ voteOnLoan server action:
    - votes row inserted
    - member count fetched via admin client (bypass RLS for correct count)
    - approve count vs threshold checked
    - if threshold met:
        - borrower's Stellar public key fetched
        - approvers' encrypted secrets fetched, decrypted
        - disburseLoan() called: Stellar payment tx signed by group key + approver keys
        - loan status updated to disbursed + stellar_tx_hash stored
→ LoanCard updates in real-time via Supabase Realtime subscription
```

Vote threshold options: `majority` (⌊n/2⌋ + 1), `two_thirds` (⌈2n/3⌉), `unanimous` (n).

### 6. Repayments

```
Borrower opens /repayments → sees their installment schedule
→ RepaymentRow: Pay button → server action
→ AMBPHP payment sent from borrower to group account
→ repayment row updated (status: paid, paid_at, stellar_tx_hash)
→ if all installments paid → loan status updated to repaid
```

### 7. Cycle Distribution

```
Admin opens /admin/cycle → sees current pot size and ownership breakdown
→ EndCycleForm → endCycle server action:
    - ownership percentages computed from all members' total_contributed
    - payout amounts computed: proportional split, rounding remainder goes to largest stakeholder
    - distributePot() called: single Stellar tx with one payment op per member (up to 100 ops)
    - interest_distributions rows inserted
    - notifications created for each member
```

### 8. Defaults

Overdue loans progress through a 4-stage escalation tracked on `loans.default_stage`:

| Stage | Trigger | Action |
|---|---|---|
| 0 | On time | — |
| 1 | 7 days overdue | Reminder notification |
| 2 | 30 days overdue | Formal notice, credit score penalty |
| 3 | 60 days overdue | Admin review required |
| 4 | 90 days overdue | Resolution: waive / partial settle / dispute |

The `/admin/defaults` page lets the admin action stage-4 loans. Resolved losses are distributed proportionally across members via `loss_distributions`.

---

## Database Schema (summary)

| Table | Purpose |
|---|---|
| `profiles` | User account + Stellar keys + credit score |
| `groups` | Savings circle config + group Stellar account |
| `group_members` | Membership join table + contribution stats |
| `contributions` | Per-cycle payment records |
| `loans` | Loan requests, status, Stellar disbursement hash |
| `votes` | Approve/deny votes on loans and extension requests |
| `repayments` | Installment schedule per loan |
| `extension_requests` | Borrower requests more time; voted on by group |
| `default_resolutions` | Admin-actioned outcomes for stage-4 defaults |
| `loss_distributions` | Per-member loss share from a resolved default |
| `interest_distributions` | Per-member interest payouts at cycle end |
| `notifications` | In-app notification feed |

All tables have RLS enabled. Cross-member profile reads (borrower names, member lists) use the service role client server-side.

---

## Credit Score

Each member's score is computed from their activity history (`lib/credit.ts`):

```
Base: 500

Bonuses (capped):
  +5 per on-time contribution       (max +200)
  +30 per loan repaid on schedule   (max +150)
  +5 per month as member            (max +100)

Penalties (capped):
  -10 per late contribution         (max -100)
  -30 per missed contribution       (max -200)
  -100 per active default           (max -300)

Range: 0–1000  →  A (800+) / B (700+) / C (600+) / D (500+) / F (<500)
```

The credit grade is displayed on each loan card to help members make informed vote decisions.

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stellar
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_ISSUER_PUBLIC_KEY=
STELLAR_ISSUER_SECRET_KEY=
STELLAR_ENCRYPTION_SECRET=        # AES key for encrypting stored Stellar secrets

# App
NEXT_PUBLIC_APP_URL=https://ambagan.site  # Used for invite link generation

# Email (Resend)
RESEND_API_KEY=
```

---

## Local Development

**Prerequisites:** Node.js 20+, pnpm, a Supabase project, a Stellar testnet issuer account.

```bash
# 1. Install dependencies
pnpm install

# 2. Copy and fill in environment variables
cp .env.example .env.local

# 3. Apply database migrations
# Run the SQL files in supabase/migrations/ in order via the Supabase SQL editor
# or: supabase db push (if using the Supabase CLI with a linked project)

# 4. Start dev server
pnpm dev
```

The app runs on [localhost:3000](http://localhost:3000).

**Run tests:**

```bash
pnpm test
```

Tests cover loan math, credit scoring, vote thresholds, cycle distribution, ownership calculations, and notification link generation.

**Test Stellar integration:**

```bash
pnpm test:stellar
```

---

## Project Structure

```
ambagan-/
├── app/
│   ├── (app)/          # Authenticated routes
│   ├── (public)/       # Public routes + auth callbacks
│   └── api/            # Route handlers (contributions, cron, Stellar account)
├── components/
│   ├── group/          # Contribute, invest, ownership, invite, join-with-invite
│   ├── landing/        # Marketing page sections
│   ├── nav/            # User + group sidebars
│   └── ui/             # Base design system components
├── lib/
│   ├── stellar.ts      # All Stellar SDK operations
│   ├── loan-math.ts    # Repayment schedule computation
│   ├── credit.ts       # Credit score algorithm
│   ├── group-threshold.ts   # Vote threshold computation
│   ├── cycle-distribution.ts # Proportional payout split
│   ├── ownership.ts    # Ownership percentage calculation
│   └── defaults.ts     # Default escalation stage logic
├── supabase/migrations/ # Ordered SQL migration files
└── utils/supabase/     # Supabase client factories (server + client)
```
