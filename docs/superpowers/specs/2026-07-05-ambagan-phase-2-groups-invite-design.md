# Ambagan Phase 2 — Group Creation & Invite

**Version:** 1.0
**Date:** 2026-07-05
**Author:** Gabrielle (with Claude)
**Parent spec:** `docs/superpowers/specs/2026-07-04-ambagan-architecture-design.md`
**Target milestone:** APAC Stellar Hackathon 2026

---

## 1. Scope

Phase 2 delivers the smallest complete group lifecycle: **create → invite → join → visible on dashboard**, with a real multisig Stellar account behind it. Contributions, votes, loans, and admin controls are out of scope for this phase.

**Done when:** Two accounts can create a group, share the invite link, join, and both see the group on their dashboards. The group's Stellar account has multiple signers configured on-chain, verifiable on Horizon.

**Spec references:** FR-GM-01 (create), FR-GM-02 (invite), FR-GM-03 (join), parent spec §7.2 (Stellar boundary).

## 2. Decisions Locked In

Resolved during Phase 2 brainstorming:

| # | Decision | Value |
|---|---|---|
| P2-D1 | Multisig threshold at creation | `threshold = 1` (admin can sign alone). Recomputed and applied on every join. |
| P2-D2 | Unauthenticated invite visitor | Redirect to `/register?invite=<token>`. After account + wallet provisioning, auto-join then redirect to `/groups/[id]`. |
| P2-D3 | Interest rate ceiling | 0–10% monthly, enforced in both the form and the server action. |
| P2-D4 | Dashboard cycle status (Phase 2) | Render a neutral "Cycle not started" pill. Replaced by real cycle state in Phase 3 without a card layout change. |

## 3. Data Flow

Three server actions, three pages, one shared component, one math helper, one new Stellar helper.

```
/groups/new (form, RSC shell + client form)
  └─▶ createGroup() server action
        1. Verify caller has stellar_public_key (else redirect /onboarding/wallet)
        2. Insert groups row (admin_id=me, invite_token auto)
        3. generateKeypair() for group fund
        4. fundTestnetAccount(group.publicKey) via Friendbot
        5. establishTrustline(group.secret) so group can hold AMBPHP
        6. setupGroupMultisig(secret, signers=[adminStellarPk], threshold=1)
        7. Update groups: stellar_account_id, stellar_secret_encrypted
        8. Insert group_members row (admin as first member)
        9. Redirect to /groups/[id]

/invite/[token] (RSC page)
  └─ unauth  → redirect /register?invite=<token>
  └─ auth    → render group preview + "Join Group" button
                 └─▶ acceptInvite(token) server action
                       1. Look up group by invite_token, verify invite_active
                       2. If already member → redirect to /groups/[id]
                       3. Insert group_members row
                       4. Load group secret, add member as signer with weight 1
                          and update thresholds to computeThreshold(...) in one tx
                       5. Redirect to /groups/[id]

/register?invite=<token> (existing page, extended)
  └─ After successful signup + wallet onboarding, call acceptInvite(token)
     and redirect to the group.

/dashboard (RSC page)
  └─ Query groups where caller is a member (RLS filters automatically)
  └─ For each group: Horizon balance fetch (parallel), member count from DB
  └─ Render <GroupCard/> per group; empty state links to /groups/new
```

## 4. Threshold Math

A new helper file, `lib/group-threshold.ts`:

```ts
export type VoteThreshold = 'majority' | 'two_thirds' | 'unanimous'

export function computeThreshold(
  voteThreshold: VoteThreshold,
  memberCount: number
): number {
  if (memberCount <= 1) return 1
  switch (voteThreshold) {
    case 'majority':   return Math.floor(memberCount / 2) + 1
    case 'two_thirds': return Math.ceil((memberCount * 2) / 3)
    case 'unanimous':  return memberCount
  }
}
```

Called at creation (returns 1) and on every join (recomputes from vote_threshold + new member count) and applied to Stellar `lowThreshold`, `medThreshold`, `highThreshold` in one transaction.

## 5. Stellar Helpers

### 5.1 Modify `setupGroupMultisig`

The current implementation sets `masterWeight: 0`, which permanently strips the group account of self-signing ability. That is the correct end-state security posture but blocks Phase 2 from adding new signers server-side after threshold rises above 1.

**Phase 2 change:** Set `masterWeight: 1` (not 0) at creation. The group's own keypair retains weight 1 and can sign as one of the signers. Combined with the admin (also weight 1), this covers up to ~4 members before we need real multisig collection.

**Phase 4 hardening (documented, not implemented here):** Drop master weight to 0 once the disbursement flow implements multi-party signature collection; after that point, all "add signer" transactions must be collected from existing members.

### 5.2 New helper `addGroupSignerAndUpdateThreshold`

Add to `lib/stellar.ts`:

```ts
export async function addGroupSignerAndUpdateThreshold(
  groupSecret: string,
  newSignerPublicKey: string,
  newThreshold: number
): Promise<Horizon.HorizonApi.SubmitTransactionResponse>
```

Builds one transaction with two operations:
1. `SetOptions` adding `newSignerPublicKey` as a signer with weight 1.
2. `SetOptions` updating `lowThreshold`, `medThreshold`, `highThreshold` to `newThreshold`.

Signed with the group's master keypair (weight 1, per §5.1). Valid while current threshold ≤ 1 (the pre-join state during Phase 2's two-account demo). If existing member count ≥ 2, the operation additionally signs with the admin's decrypted stellar secret to reach weight 2. This keeps the two-account demo path clean and gives us headroom to a handful of members without introducing multisig collection.

## 6. Files

### 6.1 Create

| Path | Purpose |
|---|---|
| `app/(app)/groups/new/page.tsx` | RSC shell rendering the form component and verifying wallet is provisioned |
| `app/(app)/groups/new/actions.ts` | `createGroup(formData)` server action |
| `components/group/create-group-form.tsx` | `"use client"` form: name, description, contribution amount, cadence, interest rate (0–10%), vote threshold, optional savings goal |
| `app/(public)/invite/[token]/page.tsx` | RSC: validates token, redirects unauth to register, renders accept UI for auth users |
| `app/(public)/invite/[token]/actions.ts` | `acceptInvite(token)` server action |
| `components/group/group-card.tsx` | Dashboard card: name, balance, member count, cycle pill |
| `components/group/join-invite-button.tsx` | `"use client"` submit button that calls `acceptInvite` |
| `lib/group-threshold.ts` | `computeThreshold` helper |

### 6.2 Modify

| Path | Change |
|---|---|
| `app/(app)/dashboard/page.tsx` | Replace shell with RSC that queries member groups, fetches balances, renders cards. Empty state offers "Create a Group" and mentions inviting a member. |
| `app/(public)/register/page.tsx` (or sign-up form) | Preserve `?invite=<token>` through the flow; after wallet provisioning, call `acceptInvite` and redirect to the group instead of `/dashboard`. |
| `lib/stellar.ts` | (a) Change `setupGroupMultisig` to set `masterWeight: 1` (§5.1). (b) Add `addGroupSignerAndUpdateThreshold` (§5.2). |
| `app/(app)/groups/[groupId]/page.tsx` | Minimal overview: name, description, group Stellar public key, current balance, copyable invite link. Full overview is Phase 3. |

## 7. Error Handling

Deliberately lean for hackathon scope. Failures are surfaced to the user with a clear message; no compensating transactions unless noted.

| Failure | Behavior |
|---|---|
| Caller has no `stellar_public_key` | Redirect to `/onboarding/wallet` from both create and accept flows before doing any work. |
| Friendbot funding fails during create | Delete the `groups` row that was inserted in step 2 and surface the error. DB row is only "committed" once Stellar setup succeeds. |
| `establishTrustline` or `setupGroupMultisig` fails during create | Same rollback — delete the groups row, surface error. |
| Invite token not found or `invite_active=false` | Render "This invite is no longer valid" page. |
| User is already a member of the invited group | Redirect to `/groups/[id]` (no error). |
| `addGroupSignerAndUpdateThreshold` fails during join | Keep the `group_members` DB row (the user *is* a member). Log the Stellar failure. Admin can retry the on-chain sync in Phase 4. Trade-off documented: DB and chain briefly diverge; the alternative (roll back the join) punishes the joiner for a chain issue and is worse UX. |
| Dashboard balance fetch fails for one group | Render the card with `balance = "—"`; don't fail the whole page. |

## 8. Form Validation

`/groups/new` form. Enforced client-side (UX) and re-enforced in the server action (trust boundary).

| Field | Rule |
|---|---|
| `name` | Required, 1–80 chars |
| `description` | Optional, ≤500 chars |
| `contribution_amount` | Required, positive number, ≤1,000,000 |
| `cadence` | Required, one of `weekly` / `biweekly` / `monthly` |
| `interest_rate` | Required, 0 ≤ x ≤ 10 (percent per month) |
| `vote_threshold` | Required, one of `majority` / `two_thirds` / `unanimous` |
| `savings_goal_name` | Optional, ≤80 chars |
| `savings_goal_amount` | Optional, positive number |
| `savings_goal_date` | Optional, must be a future date |

## 9. Verification / Done Criteria

Manual demo path exercised end-to-end:

1. Account A registers → completes `/onboarding/wallet` → creates group at `/groups/new` → lands on `/groups/[id]` → dashboard shows the group with 1 member and 0 AMBPHP balance (XLM funded).
2. Account A copies invite link from `/groups/[id]` → shares out-of-band.
3. Account B registers via the invite URL (`/invite/[token]` → `/register?invite=<token>` → wallet onboarding → auto-join) → lands on `/groups/[id]` → dashboard now shows the group for B.
4. Horizon inspection of the group's Stellar account (via Stellar Laboratory or Horizon URL) shows two signers (A and B) with weight 1 each and `low/med/high threshold = 2`.

## 10. Out of Scope (Phase 3+)

- Contributions and cycle initialization (Phase 3)
- Loan requests, voting, disbursement (Phase 4)
- Admin panel (parameter edits, member removal, invite revocation UI) (Phase 5)
- Interest distribution via Soroban (Phase 6)
- Default state handling (Phase 7)

## 11. Follow-ups Deferred

- Group secret encryption uses the shared `STELLAR_ENCRYPTION_SECRET`. Per-group key derivation is post-MVP.
- Dropping master weight on the group account (stricter security posture) requires all signer additions to be collected as multisig transactions instead of master-signed — deferred to Phase 4 alongside disbursement multisig plumbing.
- Invite revocation and rotation UI (`invite_active=false` path) is admin-panel work, not in Phase 2.
