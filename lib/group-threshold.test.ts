import { describe, it, expect } from 'vitest'
import { computeThreshold } from './group-threshold'

describe('computeThreshold', () => {
  it('returns 1 for a single-member group regardless of vote_threshold', () => {
    expect(computeThreshold('majority', 1)).toBe(1)
    expect(computeThreshold('two_thirds', 1)).toBe(1)
    expect(computeThreshold('unanimous', 1)).toBe(1)
  })

  it('computes majority as floor(n/2) + 1', () => {
    expect(computeThreshold('majority', 2)).toBe(2)
    expect(computeThreshold('majority', 3)).toBe(2)
    expect(computeThreshold('majority', 4)).toBe(3)
    expect(computeThreshold('majority', 5)).toBe(3)
  })

  it('computes two-thirds as ceil(2n/3)', () => {
    expect(computeThreshold('two_thirds', 2)).toBe(2)
    expect(computeThreshold('two_thirds', 3)).toBe(2)
    expect(computeThreshold('two_thirds', 4)).toBe(3)
    expect(computeThreshold('two_thirds', 6)).toBe(4)
  })

  it('computes unanimous as n', () => {
    expect(computeThreshold('unanimous', 2)).toBe(2)
    expect(computeThreshold('unanimous', 5)).toBe(5)
  })
})
