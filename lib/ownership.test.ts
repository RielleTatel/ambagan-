import { describe, expect, it } from 'vitest'
import { computeOwnership } from './ownership'

describe('computeOwnership', () => {
  it('computes equal shares when contributions are equal', () => {
    const rows = computeOwnership([
      { userId: 'a', totalContributed: 100 },
      { userId: 'b', totalContributed: 100 },
    ])
    expect(rows).toEqual([
      { userId: 'a', totalContributed: 100, ownershipPct: 50 },
      { userId: 'b', totalContributed: 100, ownershipPct: 50 },
    ])
  })

  it('matches the spec example (Juan/Maria/Ana/Carl)', () => {
    const rows = computeOwnership([
      { userId: 'juan', totalContributed: 15000 },
      { userId: 'maria', totalContributed: 12000 },
      { userId: 'ana', totalContributed: 17000 },
      { userId: 'carl', totalContributed: 12000 },
    ])
    const pctByUser = Object.fromEntries(rows.map((r) => [r.userId, r.ownershipPct]))
    expect(pctByUser.juan).toBeCloseTo(26.79, 2)
    expect(pctByUser.maria).toBeCloseTo(21.43, 2)
    expect(pctByUser.ana).toBeCloseTo(30.36, 2)
    expect(pctByUser.carl).toBeCloseTo(21.43, 2)
  })

  it('returns 0% for everyone when total contributions are 0', () => {
    const rows = computeOwnership([
      { userId: 'a', totalContributed: 0 },
      { userId: 'b', totalContributed: 0 },
    ])
    expect(rows.every((r) => r.ownershipPct === 0)).toBe(true)
  })

  it('returns 100% for a lone contributor', () => {
    const rows = computeOwnership([{ userId: 'solo', totalContributed: 500 }])
    expect(rows[0].ownershipPct).toBe(100)
  })

  it('returns [] for empty input', () => {
    expect(computeOwnership([])).toEqual([])
  })

  it('preserves input order', () => {
    const rows = computeOwnership([
      { userId: 'z', totalContributed: 50 },
      { userId: 'a', totalContributed: 50 },
    ])
    expect(rows.map((r) => r.userId)).toEqual(['z', 'a'])
  })
})
