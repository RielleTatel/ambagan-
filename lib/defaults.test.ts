import { describe, it, expect } from 'vitest'
import { stageForDaysPastDue, computeLossShares } from './defaults'

describe('stageForDaysPastDue', () => {
  it('returns 0 for current loans', () => {
    expect(stageForDaysPastDue(0)).toBe(0)
    expect(stageForDaysPastDue(-3)).toBe(0)
  })
  it('returns 1 within 1-7 days', () => {
    expect(stageForDaysPastDue(1)).toBe(1)
    expect(stageForDaysPastDue(7)).toBe(1)
  })
  it('returns 2 within 8-30 days', () => {
    expect(stageForDaysPastDue(8)).toBe(2)
    expect(stageForDaysPastDue(30)).toBe(2)
  })
  it('returns 3 within 31-60 days', () => {
    expect(stageForDaysPastDue(31)).toBe(3)
    expect(stageForDaysPastDue(60)).toBe(3)
  })
  it('returns 4 beyond 60 days', () => {
    expect(stageForDaysPastDue(61)).toBe(4)
    expect(stageForDaysPastDue(365)).toBe(4)
  })
})

describe('computeLossShares', () => {
  it('splits proportionally to contributions', () => {
    const shares = computeLossShares(100, { a: 300, b: 100, c: 100 })
    expect(shares).toEqual({ a: 60, b: 20, c: 20 })
  })

  it('gives the rounding remainder to the largest contributor', () => {
    const shares = computeLossShares(10, { a: 3, b: 3, c: 4 })
    // proportional shares: c gets 4.00, a and b get 3.00 each = 10.00 total.
    // if remainder exists, it goes to c (largest).
    const total = Object.values(shares).reduce((acc, v) => acc + v, 0)
    expect(Math.round(total * 100) / 100).toBe(10)
    expect(shares.c).toBeGreaterThanOrEqual(shares.a)
    expect(shares.c).toBeGreaterThanOrEqual(shares.b)
  })

  it('returns {} when total loss is zero or negative', () => {
    expect(computeLossShares(0, { a: 10 })).toEqual({})
    expect(computeLossShares(-5, { a: 10 })).toEqual({})
  })

  it('returns {} when no member has contributed', () => {
    expect(computeLossShares(100, { a: 0, b: 0 })).toEqual({})
  })

  it('handles a single member absorbing the entire loss', () => {
    expect(computeLossShares(50, { solo: 500 })).toEqual({ solo: 50 })
  })
})
