export type MemberContribution = {
  userId: string
  totalContributed: number
}

export type OwnershipRow = {
  userId: string
  totalContributed: number
  ownershipPct: number
}

export function computeOwnership(
  members: MemberContribution[],
): OwnershipRow[] {
  const total = members.reduce((acc, m) => acc + m.totalContributed, 0)
  if (total <= 0) {
    return members.map((m) => ({
      userId: m.userId,
      totalContributed: m.totalContributed,
      ownershipPct: 0,
    }))
  }
  return members.map((m) => ({
    userId: m.userId,
    totalContributed: m.totalContributed,
    ownershipPct: round2((m.totalContributed / total) * 100),
  }))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
