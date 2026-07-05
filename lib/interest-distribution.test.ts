import { describe, expect, it } from 'vitest'
import { computeInterestShares } from './interest-distribution'

describe('computeInterestShares', () => {
  it('splits interest equally when the amount divides cleanly', () => {
    const shares = computeInterestShares(30, ['a', 'b', 'c'])
    expect(shares).toEqual([
      { memberId: 'a', amount: 10 },
      { memberId: 'b', amount: 10 },
      { memberId: 'c', amount: 10 },
    ])
  })

  it('gives the rounding remainder to the last member', () => {
    const shares = computeInterestShares(10, ['a', 'b', 'c'])
    expect(shares[0].amount).toBe(3.33)
    expect(shares[1].amount).toBe(3.33)
    expect(shares[2].amount).toBe(3.34)
    const total = shares.reduce((acc, s) => acc + s.amount, 0)
    expect(Math.round(total * 100) / 100).toBe(10)
  })

  it('returns [] when there are no non-borrower members', () => {
    expect(computeInterestShares(50, [])).toEqual([])
  })

  it('returns [] when total interest is zero or negative', () => {
    expect(computeInterestShares(0, ['a', 'b'])).toEqual([])
    expect(computeInterestShares(-5, ['a', 'b'])).toEqual([])
  })

  it('handles a single non-borrower member', () => {
    expect(computeInterestShares(7.77, ['solo'])).toEqual([
      { memberId: 'solo', amount: 7.77 },
    ])
  })
})
