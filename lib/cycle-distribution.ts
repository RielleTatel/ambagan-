import type { OwnershipRow } from './ownership'

export type PayoutRow = {
  userId: string
  amount: number
}

// Splits totalFund among members proportional to ownership share. The
// rounding remainder (from 2-decimal rounding) goes to the highest-ownership
// member so the sum exactly equals totalFund.
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
