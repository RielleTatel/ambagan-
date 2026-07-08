# AMBPHP Currency — How It Works

## What is AMBPHP?

AMBPHP is a custom asset issued on the **Stellar testnet** by the Ambagan app's issuer account. It is conceptually pegged to the Philippine Peso (₱) and acts as the in-app currency for all group contributions, loans, repayments, and cycle payouts.

It is **not real money**. In this hackathon build it is a demo token on Stellar's testnet.

---

## Account Provisioning (New Users)

Every new user goes through a one-time wallet setup at `/onboarding/wallet`. The following happens automatically:

| Step | What happens | Code |
|------|-------------|------|
| 1 | A Stellar keypair is generated server-side | `generateKeypair()` in `lib/stellar.ts` |
| 2 | The new account is funded with testnet XLM via [Friendbot](https://friendbot.stellar.org) | `fundTestnetAccount()` in `lib/stellar.ts` |
| 3 | The account opts in to hold AMBPHP (Stellar requires an explicit trustline) | `establishTrustline()` in `lib/stellar.ts` |
| 4 | **10,000 AMBPHP is minted** to the account from the issuer | `mintAMBPHP(publicKey, '10000')` in `lib/stellar-user.ts` |
| 5 | The public key and AES-encrypted secret are saved to `profiles` in Supabase | `app/api/stellar/account/route.ts` |

The secret key is encrypted with `STELLAR_ENCRYPTION_SECRET` before storage. Users never see or handle their own keys — this is a **custodial** model.

---

## Starting Balance

Every new user receives **10,000 AMBPHP** on signup. This is intentional for the hackathon demo so testers can contribute to groups immediately without a separate faucet step.

In a production build this would be replaced with a real fiat on-ramp (e.g. GCash → AMBPHP).

---

## XLM vs AMBPHP

Users only ever interact with **AMBPHP**. XLM is only used internally to pay Stellar network transaction fees — it never appears in the app UI.

---

## How AMBPHP Moves Through the App

```
User wallet
    │
    ├─ contribute() ──────────────────────────────► Group fund account
    │   (sendAMBPHP, required contribution)               │
    │                                                      │
    ├─ invest() ──────────────────────────────────►        │  (grows the pot)
    │   (sendAMBPHP, optional investment)                  │
    │                                                      │
    │          ◄── disburseLoan() ──────────────────────── │  (loan approved)
    │                                                      │
    │   repay() ──────────────────────────────────►        │  (repayment + interest back to pot)
    │                                                      │
    │          ◄── distributePot() ─────────────────────── │  (cycle ends, proportional payout)
```

### Key operations

| Operation | Direction | Function |
|-----------|-----------|----------|
| Contribution | User → Group | `sendAMBPHP()` |
| Optional investment | User → Group | `sendAMBPHP()` |
| Loan disbursement | Group → User | `disburseLoan()` |
| Loan repayment | User → Group | `sendAMBPHP()` |
| Cycle payout | Group → All members | `distributePot()` |

---

## Cycle Payout Logic

At cycle end the admin triggers a distribution. The entire on-chain AMBPHP balance of the group account is split among all members **proportional to their ownership percentage**:

```
ownership % = member's total contributed / group's total contributed × 100
payout      = group balance × (ownership % / 100)
```

Rounding remainders go to the highest-ownership member so the sum always equals the exact balance. All payouts are sent in a **single Stellar transaction** (one payment operation per member, up to 100).

---

## Relevant Files

| File | Role |
|------|------|
| `lib/stellar.ts` | All Stellar SDK operations (mint, send, trustline, distribute) |
| `lib/stellar-user.ts` | `createCustodialAccount()` — full new-user provisioning flow |
| `lib/ownership.ts` | Pure ownership % computation |
| `lib/cycle-distribution.ts` | Pure payout amount computation |
| `app/api/stellar/account/route.ts` | POST endpoint that triggers provisioning |
| `app/(app)/onboarding/wallet/` | UI that calls the provisioning endpoint on signup |
| `app/(app)/groups/[groupId]/admin/cycle/actions.ts` | `endCycleAndDistribute()` server action |
