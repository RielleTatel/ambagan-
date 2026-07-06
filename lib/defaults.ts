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
