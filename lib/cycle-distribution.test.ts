import { describe, expect, it } from 'vitest'
import { computeCyclePayouts } from './cycle-distribution'
import type { OwnershipRow } from './ownership'

function pct(userId: string, ownershipPct: number): OwnershipRow {
  return { userId, totalContributed: 0, ownershipPct }
}

describe('computeCyclePayouts', () => {
  it('splits an evenly-owned fund evenly', () => {
    const payouts = computeCyclePayouts(1000, [pct('a', 50), pct('b', 50)])
    expect(payouts).toEqual([
      { userId: 'a', amount: 500 },
      { userId: 'b', amount: 500 },
    ])
  })

  it('matches the spec example (₱126,000 fund, four members)', () => {
    const payouts = computeCyclePayouts(126000, [
      pct('juan', 26.79),
      pct('maria', 21.43),
      pct('ana', 30.36),
      pct('carl', 21.43),
    ])
    const total = payouts.reduce((acc, p) => acc + p.amount, 0)
    expect(Math.round(total * 100) / 100).toBe(126000)
  })

  it('assigns the rounding remainder to the largest-ownership member', () => {
    const payouts = computeCyclePayouts(100, [
      pct('a', 33.33),
      pct('b', 33.33),
      pct('c', 33.34),
    ])
    const sum = payouts.reduce((acc, p) => acc + p.amount, 0)
    expect(Math.round(sum * 100) / 100).toBe(100)
    const c = payouts.find((p) => p.userId === 'c')!
    expect(c.amount).toBeGreaterThanOrEqual(33.33)
  })

  it('returns [] when the fund is zero or negative', () => {
    expect(computeCyclePayouts(0, [pct('a', 100)])).toEqual([])
    expect(computeCyclePayouts(-5, [pct('a', 100)])).toEqual([])
  })

  it('returns [] when ownership is empty', () => {
    expect(computeCyclePayouts(100, [])).toEqual([])
  })

  it('preserves input order', () => {
    const payouts = computeCyclePayouts(200, [pct('z', 25), pct('a', 75)])
    expect(payouts.map((p) => p.userId)).toEqual(['z', 'a'])
  })
})
