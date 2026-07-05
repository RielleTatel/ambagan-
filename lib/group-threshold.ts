export type VoteThreshold = 'majority' | 'two_thirds' | 'unanimous'

export function computeThreshold(
  voteThreshold: VoteThreshold,
  memberCount: number,
): number {
  if (memberCount <= 1) return 1
  switch (voteThreshold) {
    case 'majority':
      return Math.floor(memberCount / 2) + 1
    case 'two_thirds':
      return Math.ceil((memberCount * 2) / 3)
    case 'unanimous':
      return memberCount
  }
}
