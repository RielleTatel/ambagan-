import { describe, it, expect } from 'vitest'
import { computeCreditScore, creditLetterGrade } from './credit'

const zero = {
  onTimeContributions: 0,
  lateContributions: 0,
  missedContributions: 0,
  loansRepaidOnSchedule: 0,
  activeDefaults: 0,
  monthsAsMember: 0,
}

describe('computeCreditScore', () => {
  it('returns base 500 for a new member with no history', () => {
    expect(computeCreditScore(zero)).toBe(500)
  })

  it('adds +5 per on-time contribution, capped at +200', () => {
    expect(computeCreditScore({ ...zero, onTimeContributions: 10 })).toBe(550)
    expect(computeCreditScore({ ...zero, onTimeContributions: 100 })).toBe(700) // 200 cap
  })

  it('adds +30 per loan repaid on schedule, capped at +150', () => {
    expect(computeCreditScore({ ...zero, loansRepaidOnSchedule: 3 })).toBe(590)
    expect(computeCreditScore({ ...zero, loansRepaidOnSchedule: 20 })).toBe(650) // 150 cap
  })

  it('adds +5 per month as member, capped at +100', () => {
    expect(computeCreditScore({ ...zero, monthsAsMember: 5 })).toBe(525)
    expect(computeCreditScore({ ...zero, monthsAsMember: 40 })).toBe(600) // 100 cap
  })

  it('penalizes -10 per late contribution, capped at -100', () => {
    expect(computeCreditScore({ ...zero, lateContributions: 5 })).toBe(450)
    expect(computeCreditScore({ ...zero, lateContributions: 50 })).toBe(400) // 100 cap
  })

  it('penalizes -30 per missed contribution, capped at -200', () => {
    expect(computeCreditScore({ ...zero, missedContributions: 3 })).toBe(410)
    expect(computeCreditScore({ ...zero, missedContributions: 20 })).toBe(300) // 200 cap
  })

  it('penalizes -100 per active default, capped at -300', () => {
    expect(computeCreditScore({ ...zero, activeDefaults: 2 })).toBe(300)
    expect(computeCreditScore({ ...zero, activeDefaults: 10 })).toBe(200) // 300 cap
  })

  it('clamps result to [0, 1000]', () => {
    const veryGood = {
      ...zero,
      onTimeContributions: 200,
      loansRepaidOnSchedule: 20,
      monthsAsMember: 60,
    }
    expect(computeCreditScore(veryGood)).toBe(950)

    const veryBad = {
      ...zero,
      lateContributions: 20,
      missedContributions: 20,
      activeDefaults: 5,
    }
    expect(computeCreditScore(veryBad)).toBe(0)
  })
})

describe('creditLetterGrade', () => {
  it('returns A for 800+', () => {
    expect(creditLetterGrade(800)).toBe('A')
    expect(creditLetterGrade(1000)).toBe('A')
  })
  it('returns B for 700..799', () => {
    expect(creditLetterGrade(700)).toBe('B')
    expect(creditLetterGrade(799)).toBe('B')
  })
  it('returns C for 600..699', () => {
    expect(creditLetterGrade(600)).toBe('C')
    expect(creditLetterGrade(699)).toBe('C')
  })
  it('returns D for 500..599', () => {
    expect(creditLetterGrade(500)).toBe('D')
    expect(creditLetterGrade(599)).toBe('D')
  })
  it('returns F below 500', () => {
    expect(creditLetterGrade(0)).toBe('F')
    expect(creditLetterGrade(499)).toBe('F')
  })
})
