import { describe, it, expect } from 'vitest'
import { computeRepaymentSchedule, computeMemberLoanCeiling } from './loan-math'

describe('computeRepaymentSchedule', () => {
  it('splits principal evenly with 0% interest', () => {
    const schedule = computeRepaymentSchedule(1200, 4, 0)
    expect(schedule).toHaveLength(4)
    expect(schedule.every((s) => s.principal === 300)).toBe(true)
    expect(schedule.every((s) => s.interest === 0)).toBe(true)
    expect(schedule.every((s) => s.amountDue === 300)).toBe(true)
  })

  it('produces monthly installments totalling principal + interest', () => {
    const schedule = computeRepaymentSchedule(1200, 12, 0.12)
    expect(schedule).toHaveLength(12)
    const total = schedule.reduce((acc, s) => acc + s.amountDue, 0)
    // 12% annual, 12 months, 1200 principal: total = 1200 + (1200 × 0.01 × 12) = 1344
    expect(total).toBeCloseTo(1344, 0)
  })

  it('numbers installments starting at 1', () => {
    const schedule = computeRepaymentSchedule(600, 3, 0.06)
    expect(schedule.map((s) => s.installmentNumber)).toEqual([1, 2, 3])
  })
})

describe('computeMemberLoanCeiling', () => {
  it('caps at half the group balance', () => {
    expect(computeMemberLoanCeiling(1000, 5)).toBe(500)
  })

  it('returns 0 when the group has nothing', () => {
    expect(computeMemberLoanCeiling(0, 3)).toBe(0)
  })
})
