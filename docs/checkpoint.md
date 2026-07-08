# Ambagan — Build Checkpoint

**Date:** 2026-07-05  
**Phase complete:** 2 of 6  
**Status:** Group creation + invite flow working end-to-end on Stellar testnet

---

## What Ambagan Is
Ambagan is a community-powered savings and lending platform that digitizes the traditional Filipino paluwagan. It enables trusted groups—such as families, friends, cooperatives, student organizations, and workplaces—to contribute to a shared savings fund, collectively approve loan requests, and transparently track every contribution, repayment, and transaction. By combining collaborative financial management with modern digital tools, Ambagan promotes accountability, trust, and shared financial growth within every community.

---

## User Flow (as built)

```
Landing (/)
  └─ Register (/register)
       │  email + password → Supabase magic-link confirmation
       │  (invite token threaded through email redirect URL if present)
       └─ Wallet onboarding (/onboarding/wallet)
            │  generates Stellar keypair, funds via Friendbot,
            │  creates AMBPHP trustline, encrypts & stores secret
            └─ Dashboard (/dashboard)
                 │  shows all groups the user belongs to
                 ├─ Create group (/groups/new)
                 │    form → server action → DB row + Stellar multisig account
                 │    → group overview page
                 └─ Accept invite (/invite/[token])
                      preview group → Join → insert as member
                      → add as signer on Stellar account
                      → redirect to group dashboard
```

**Invite token survival through email confirmation:**
When a new user clicks an invite link before having an account, the token is preserved through the entire registration flow:

1. `/invite/[token]` → unauthenticated → redirect to `/register?invite=<token>`
2. `SignUpForm` appends `?invite=<token>` to the Supabase `emailRedirectTo` URL
3. After email confirmation, Supabase redirects to `/onboarding/wallet?invite=<token>`
4. After wallet provisioning, the page redirects to `/invite/<token>` to complete joining

---

## Technology Roles

### Next.js (App Router)

The UI framework and server trust boundary. Everything that touches secrets or the database runs as a React Server Component (RSC) or Server Action — never exposed to the browser.

**Key patterns used:**

- **RSC** — data-fetching pages (dashboard, group overview, invite preview) run on the server with direct Supabase access. No client-side fetching, no loading states beyond Suspense.
- **Server Actions** — mutations (`createGroup`, `acceptInvite`) are `"use server"` functions called directly from client components. They validate auth, write to Supabase, and call Stellar — all server-side.
- **API Route Handlers** — used for the post-signup invite acceptance (`/api/invite/accept-after-signup`) because the `SignUpForm` needs to POST after wallet provisioning completes.
- **Layouts** — nested. `/app/(app)/layout.tsx` wraps all authenticated pages: outer `UserSidebar` + `AuthGate`. `/app/(app)/groups/[groupId]/layout.tsx` adds the inner `GroupSidebar` for group-scoped pages.
- **Suspense + skeletons** — async server components (sidebars, auth gate) are wrapped in Suspense so the shell renders immediately while data loads.

**RSC/Client boundary rule:** Functions cannot cross the server→client boundary. Icons are passed as rendered `ReactNode` (`<Home />`) not as component references (`Home`).

---

### Supabase

Auth, database, and row-level security. The single source of truth for all application state.

**Auth:**
- Email/password with magic-link confirmation
- `createClient()` helpers for server (cookie-based) and client (browser) contexts
- `supabase.auth.getUser()` in RSCs to gate authenticated routes

**Database tables (schema v1):**

| Table | Purpose |
|---|---|
| `profiles` | One row per user. Stores `stellar_public_key`, `stellar_secret_encrypted` |
| `groups` | Group config: name, description, `stellar_account_id`, `invite_token`, `invite_active`, `vote_threshold`, `contribution_amount_php`, `cadence`, `interest_rate_bps`, `savings_goal_php` |
| `group_members` | Join table: `user_id` + `group_id` + `role` (admin / member) |
| `contributions` | Payment records per cycle |
| `loans` | Loan requests with `status` (pending / approved / active / repaid / defaulted) |
| `votes` | Per-member votes on loan approval |
| `repayments` | Loan repayment installments |
| `extension_requests` | Member requests to extend loan term |
| `default_resolutions` | Admin decisions on defaults |
| `loss_distributions` | How losses are spread across members |
| `interest_distributions` | Interest earnings distribution |
| `notifications` | In-app notification queue |

**Row Level Security:**
All tables have RLS enabled. Key policies:
- Users can only read their own profile
- Group data is visible only to members (enforced via `is_group_member()` helper function)
- Invite preview: unauthenticated users can read `invite_active = true` groups by token (migration 0002)

**RLS gotcha solved:** The naive `EXISTS (SELECT 1 FROM group_members WHERE ...)` policy on `group_members` caused infinite recursion — the policy queries the table it's protecting. Fixed by a `SECURITY DEFINER` Postgres function `is_group_member(gid uuid)` that bypasses RLS internally (migration 0003).

---

### Stellar

On-chain enforcement. Every group has a dedicated Stellar account that holds the group's AMBPHP (Philippine Peso-pegged custom asset) balance. The account is a **multisig** — no single person can sign a transaction alone.

**Custom asset:**
`AMBPHP` — issued by a fixed testnet issuer keypair stored in `.env`. Represents PHP-denominated contributions. All group accounts establish a trustline to AMBPHP at creation.

**Account lifecycle:**

```
Group created
  └─ Friendbot funds new keypair (testnet XLM for fees)
       └─ Trustline to AMBPHP established
            └─ SetOptions: master weight = 1, threshold = 1
                 (admin signs alone until second member joins)

Member joins
  └─ Member's stellar_public_key added as signer (weight = 1)
       └─ Threshold recomputed:
            majority  → floor(n/2) + 1
            two_thirds → ceil(2n/3)
            unanimous  → n
            (single member always stays at 1)
```

**Custodial key storage:**
Users don't manage their own keys. At wallet provisioning:
1. `generateKeypair()` creates a fresh Ed25519 keypair
2. Secret key is encrypted with AES-256 (CryptoJS) using `STELLAR_ENCRYPTION_SECRET` from `.env`
3. Encrypted blob is stored in `profiles.stellar_secret_encrypted`
4. Public key is stored in `profiles.stellar_public_key`

When a transaction needs signing, the server decrypts the secret on demand. The plaintext secret never leaves the server.

**Horizon API:**
Used client-side (via `/api/stellar/account` proxy) and server-side to read live AMBPHP balances displayed on the dashboard and group overview.

---

## File Map

```
app/
  (public)/
    page.tsx                    Landing page
    register/page.tsx           Sign-up form (invite-aware)
    login/page.tsx              Login form
    invite/[token]/
      page.tsx                  Group preview for invitees
      join-button.tsx           "Join group" client button
      actions.ts                acceptInvite server action
  (app)/
    layout.tsx                  Auth gate + UserSidebar shell
    dashboard/page.tsx          Group card grid
    onboarding/wallet/
      page.tsx                  Wallet provisioning gate
      wallet-provisioner.tsx    Keypair gen + Friendbot + trustline
    groups/
      new/
        page.tsx                Create group gate (needs wallet)
        create-group-form.tsx   Form UI
        actions.ts              createGroup server action
      [groupId]/
        layout.tsx              GroupSidebar shell
        page.tsx                Group overview (balance, members)
        loans/page.tsx          (stub)
        ledger/page.tsx         (stub)
        repayments/page.tsx     (stub)
        admin/page.tsx          (stub)
        admin/defaults/page.tsx (stub)
        admin/export/page.tsx   (stub)

api/
  invite/accept-after-signup/route.ts   POST: join after email confirm
  stellar/account/route.ts              GET: Horizon balance proxy
  groups/[groupId]/invite/route.ts      GET: generate/return invite link
  (others stubbed for Phase 3+)

components/
  nav/
    user-sidebar.tsx    Outer 64px sidebar (groups list + user actions)
    group-sidebar.tsx   Inner 256px sidebar (group nav + admin section)
    icon-nav-item.tsx   Icon button for outer sidebar
    nav-item.tsx        Text nav item for inner sidebar
  group/
    group-card.tsx      Dashboard card (name, balance, member count)
    invite-link.tsx     Read-only input + copy button

lib/
  stellar.ts            Stellar SDK wrapper (keypair, Friendbot, multisig)
  stellar-user.ts       Full user wallet provisioning flow
  group-threshold.ts    computeThreshold(voteThreshold, memberCount)
  group-threshold.test.ts  Vitest unit tests

supabase/migrations/
  0001_initial.sql                  Full schema + RLS + triggers
  0002_invite_lookup_policy.sql     Invite preview policy
  0003_fix_group_members_recursion.sql  SECURITY DEFINER fix
```

---

## Phase Status

| Phase | Description | Status |
|---|---|---|
| 1 | Auth: register, login, email confirm, wallet onboarding | Done |
| 2 | Group creation, invite flow, dashboard | Done |
| 3 | Contribution cycle: schedule, collect, distribute pot | Not started |
| 4 | Loan flow: request, vote, disburse, repay | Not started |
| 5 | Default handling, loss distribution | Not started |
| 6 | Soroban smart contracts (replace custodial signing) | Not started |

---

## Known Limitations (Phase 2)

- **Admin-only signing beyond 2 members:** When `memberCount > 2`, the Stellar threshold rises above 1 and two signers are needed. Currently the code reads the admin's encrypted secret to provide the second signature. Members who aren't admin cannot trigger threshold changes. Works for the 2-person hackathon demo; needs a proper signing ceremony in Phase 4.
- **No on-chain contribution collection:** AMBPHP balances shown are live from Horizon, but no actual transfers happen yet — that's Phase 3.
- **Stub pages:** Loans, ledger, repayments, admin settings routes render placeholder text.
- **Testnet only:** Friendbot and testnet Horizon URL are hardcoded via env vars. Mainnet migration is out of scope for the hackathon.
