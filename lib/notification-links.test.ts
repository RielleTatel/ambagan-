import { describe, expect, it } from 'vitest'
import {
  notificationDeepLink,
  notificationIconName,
} from './notification-links'

describe('notificationDeepLink', () => {
  it('sends contribution_reminder to the group overview', () => {
    expect(notificationDeepLink('contribution_reminder', 'g1')).toBe(
      '/groups/g1',
    )
  })

  it('sends repayment_reminder to the repayments page', () => {
    expect(notificationDeepLink('repayment_reminder', 'g1')).toBe(
      '/groups/g1/repayments',
    )
  })

  it('sends default_escalation to the loans page', () => {
    expect(notificationDeepLink('default_escalation', 'g1')).toBe(
      '/groups/g1/loans',
    )
  })

  it('sends cycle_distribution to the group overview', () => {
    expect(notificationDeepLink('cycle_distribution', 'g1')).toBe('/groups/g1')
  })

  it('falls back to the group overview for unknown types', () => {
    expect(notificationDeepLink('mystery_type', 'g1')).toBe('/groups/g1')
  })

  it('returns null when groupId is missing', () => {
    expect(notificationDeepLink('contribution_reminder', null)).toBeNull()
  })
})

describe('notificationIconName', () => {
  it('maps known types to their icons', () => {
    expect(notificationIconName('contribution_reminder')).toBe('Coins')
    expect(notificationIconName('repayment_reminder')).toBe('CalendarClock')
    expect(notificationIconName('default_escalation')).toBe('AlertTriangle')
    expect(notificationIconName('cycle_distribution')).toBe('PartyPopper')
  })

  it('falls back to Bell for unknown types', () => {
    expect(notificationIconName('anything_else')).toBe('Bell')
  })
})
