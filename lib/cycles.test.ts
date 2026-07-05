import { describe, it, expect } from 'vitest'
import { computeCurrentCycle, computeCycleDueDate } from './cycles'

describe('computeCurrentCycle', () => {
  it('returns 1 on the day the group is created', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    expect(computeCurrentCycle(created, 'weekly', created)).toBe(1)
  })

  it('rolls to cycle 2 after one week for weekly cadence', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-08T00:00:00Z')
    expect(computeCurrentCycle(created, 'weekly', now)).toBe(2)
  })

  it('rolls to cycle 2 after 14 days for biweekly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-15T00:00:00Z')
    expect(computeCurrentCycle(created, 'biweekly', now)).toBe(2)
  })

  it('rolls to cycle 2 after 30 days for monthly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const now = new Date('2026-01-31T00:00:00Z')
    expect(computeCurrentCycle(created, 'monthly', now)).toBe(2)
  })
})

describe('computeCycleDueDate', () => {
  it('returns end of cycle 1 as created + cycle length for weekly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const due = computeCycleDueDate(created, 'weekly', 1)
    expect(due.toISOString()).toBe('2026-01-08T00:00:00.000Z')
  })

  it('returns end of cycle 3 for monthly', () => {
    const created = new Date('2026-01-01T00:00:00Z')
    const due = computeCycleDueDate(created, 'monthly', 3)
    expect(due.toISOString()).toBe('2026-04-01T00:00:00.000Z')
  })
})
