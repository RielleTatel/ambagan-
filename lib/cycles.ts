export type Cadence = 'weekly' | 'biweekly' | 'monthly'

const CYCLE_DAYS: Record<Cadence, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
}

export function computeCurrentCycle(
  groupCreatedAt: Date,
  cadence: Cadence,
  now: Date = new Date(),
): number {
  const days = (now.getTime() - groupCreatedAt.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(days / CYCLE_DAYS[cadence]) + 1
}

export function computeCycleDueDate(
  groupCreatedAt: Date,
  cadence: Cadence,
  cycleNumber: number,
): Date {
  const ms = CYCLE_DAYS[cadence] * cycleNumber * 24 * 60 * 60 * 1000
  return new Date(groupCreatedAt.getTime() + ms)
}
