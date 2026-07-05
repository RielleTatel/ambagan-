export type InterestShare = { memberId: string; amount: number }

export function computeInterestShares(
  totalInterest: number,
  nonBorrowerMemberIds: string[],
): InterestShare[] {
  if (nonBorrowerMemberIds.length === 0 || totalInterest <= 0) return []

  const n = nonBorrowerMemberIds.length
  const per = round2(totalInterest / n)
  const shares: InterestShare[] = nonBorrowerMemberIds.map((memberId) => ({
    memberId,
    amount: per,
  }))

  const roundedTotal = round2(totalInterest)
  const currentSum = round2(per * n)
  const remainder = round2(roundedTotal - currentSum)
  if (remainder !== 0) {
    shares[shares.length - 1].amount = round2(
      shares[shares.length - 1].amount + remainder,
    )
  }
  return shares
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
