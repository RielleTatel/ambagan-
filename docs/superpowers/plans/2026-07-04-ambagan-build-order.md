# Ambagan Build Order

**Date:** 2026-07-04
**Deadline:** APAC Stellar Hackathon 2026 — demo by July 15, 2026
**Cross-refs:** [architecture spec](../specs/2026-07-04-ambagan-architecture-design.md), source `Ambagan_SRS_v1.docx`

The six-phase build order to get from the current scaffold to a demoable Stellar-integrated MVP. Each phase produces something testable on its own. Complete a phase before starting the next — sequencing matters here because the Stellar work in Phase 3 blocks all the money-moving screens after it.

---

## Phase 1 — Foundation

Do this first, before any UI beyond auth. Nothing else works without a database and a logged-in user with a Stellar account.

- [ ] Run the Supabase schema — SQL already defined at `supabase/migrations/0001_initial.sql`. Apply in Supabase SQL editor.
- [ ] Register flow: full name + email + password, plus custodial Stellar keypair generation on submit, encrypt secret, store public key on `profiles`. The Supabase starter template gives you ~80% of this — just add the Stellar keypair step on register.
- [ ] Login flow — already scaffolded, verify redirects go to `/dashboard`.
- [ ] `middleware.ts` auth guard — already scaffolded, verify it redirects unauthenticated users to `/login`.

**Done when:** you can register, get redirected into `/dashboard`, and see a Stellar public key on your profile row in Supabase.

**Spec refs:** FR-GM-03, §7.1, §7.5.

---

## Phase 2 — Group creation and invite

Just enough of groups to create one and invite others. Don't build the admin panel fully yet.

- [ ] Create group form (`/groups/new`): name, description, contribution amount, cadence, interest rate, threshold. On submit: create the group in Supabase, generate a Stellar account for the group fund, fund it via Friendbot on testnet, store encrypted secret and public key.
- [ ] Invite accept page (`/invite/[token]`): validate token against `groups.invite_token`, add the accepting user to `group_members`, add their Stellar public key as a signer on the group's multisig account.
- [ ] Dashboard (`/dashboard`): render group cards for every group the user belongs to. Fund balance, member count, current cycle status. No fancy visuals — just the data.

**Done when:** two accounts can create a group, share the invite link, join, and both see the group on their dashboards. The group's Stellar account has multiple signers configured on-chain.

**Spec refs:** FR-GM-01, FR-GM-02, FR-GM-03, §7.2.

---

## Phase 3 — Stellar core

**This is the phase most projects get wrong by leaving it too late.** Before building any more UI, get the Stellar service solid. Test everything with raw SDK calls (`scripts/*.mjs`) before wiring it to a form.

- [x] Generate custodial keypairs on register — done via `lib/stellar.ts::generateKeypair` / `encryptSecret`
- [x] Create group Stellar accounts — done via `lib/stellar.ts::fundTestnetAccount` (issuer set up via `scripts/setup-stellar.mjs`)
- [ ] Configure multisig on the group account — `lib/stellar.ts::setupGroupMultisig` exists; verify it end-to-end with a test script that adds three signers and requires two signatures for outgoing payments.
- [ ] Submit a basic payment transaction (contribution: member → group account). Verify with `getAccountTransactions` that the tx lands.
- [ ] Read account balance from Horizon — `getAMBPHPBalance` exists; verify against a funded account.
- [ ] Multisig disbursement test: build a transaction that requires two signatures, sign with two keys, submit, verify it lands.

Test all of this with raw SDK calls first — **no UI**. Once these six operations work, the rest of the app is mostly Supabase queries with Stellar calls plugged in.

**Done when:** `scripts/test-stellar.mjs` (rename to `.mjs` or add `"type": "module"` to `package.json`) runs end-to-end and prints tx hashes for each of: fund, trustline, mint, transfer, multisig setup, multisig disbursement.

**Spec refs:** §7.1, §7.2, §7.3, NFR 5.5.

---

## Phase 4 — Contributions

- [ ] Contribution submission button on group overview. Triggers a Stellar payment from the member's account to the group fund account, records the tx hash + cycle number in `contributions`, updates `group_members.contribution_streak`.
- [ ] Group overview screen (`/groups/[groupId]`): fund pool balance (live from Stellar via `getAMBPHPBalance`), member list with current-cycle contribution status icons, savings goal progress bar.
- [ ] Contribution status board: who's paid, who's pending, who's overdue this cycle. Reads from the `contributions` table filtered by cycle.

**Done when:** three members can each contribute in a group and everyone can see who has paid on the overview screen.

**Spec refs:** FR-CS-01, FR-CS-03, FR-CS-04, FR-CS-05.

---

## Phase 5 — Loans (demo centerpiece)

This is what the judges will see. Prioritize polish here.

- [ ] Loan request form (`/groups/[groupId]/loans/request`): amount (validated against member ceiling), purpose tag, description, repayment months. Show a live repayment-schedule preview before submit.
- [ ] Loan marketplace (`/groups/[groupId]/loans`): cards for every open request with vote tallies, purpose badges, credit letter grade, time remaining. Approve/Deny buttons on each card.
- [ ] Voting: each vote records in `votes` and captures the member's signature on the pending disbursement transaction. Realtime vote counter updates via Supabase Realtime.
- [ ] Disbursement: when the threshold is met, assemble the pre-collected multisig transaction and submit it to Stellar. Funds move from group account to borrower account atomically. Generate the repayment schedule in `repayments`.

**Done when:** a member requests a loan, the group votes to approve, and funds land in the borrower's Stellar account without any single party being able to move them alone.

**Spec refs:** FR-LR-01 through FR-LR-05, §7.2.

---

## Phase 6 — Repayment and interest

- [ ] Repayment tracker (`/groups/[groupId]/repayments`): calendar view of the borrower's installments with a Make Payment button on the current due row.
- [ ] Repayment submission: Stellar transaction from borrower → group account. Records `stellar_tx_hash` and marks the `repayments` row as paid.
- [ ] Interest distribution: calculate each member's share of the interest paid, record in `interest_distributions`. **Scope adjustment (from user, 2026-07-04):** for the hackathon, this can be a **backend calculation** rather than a full Soroban contract — fake the on-chain part if needed to save time. The Soroban `interest-distribution` contract skeleton stays in `contracts/` for post-hackathon.

**Done when:** the borrower can make repayments through the UI, the ledger reflects them with Stellar tx hashes, and each other member sees their share of the interest in their profile.

**Spec refs:** FR-LR-05, FR-LR-06.

---

## Explicit Deviations From the Spec

Recording these so future decisions have context.

| Spec section | Spec says | Build order says | Why |
|---|---|---|---|
| §7.4, FR-LR-06 | Soroban `interest-distribution` contract executes and pays out on-chain | Backend calculation in Next.js, ledger row only | Save time for hackathon demo. Contract skeleton preserved for post-hackathon. |
| §8 (default handling) | Full 4-stage default system with Soroban `default-state` contract | Not in the build order — deferred | Not on the critical path for the demo story. Detection and Stage 1/2 flag can be added after Phase 6 if time permits. |

---

## What's Deliberately Not In This Build Order

Ledger export (PDF/CSV), notifications (Resend emails), credit scoring UI polish, streak badges, `/onboarding/wallet` Freighter opt-in, admin panel. These are Phase 7+ polish — add once the six phases above run end-to-end. They don't block the demo path.
