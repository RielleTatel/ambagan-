export type NotificationType =
  | 'contribution_reminder'
  | 'repayment_reminder'
  | 'default_escalation'
  | 'cycle_distribution'

export type NotificationIconName =
  | 'Coins'
  | 'CalendarClock'
  | 'AlertTriangle'
  | 'PartyPopper'
  | 'Bell'

export function notificationDeepLink(
  type: string,
  groupId: string | null,
): string | null {
  if (!groupId) return null
  switch (type) {
    case 'repayment_reminder':
      return `/groups/${groupId}/repayments`
    case 'default_escalation':
      return `/groups/${groupId}/loans`
    case 'contribution_reminder':
    case 'cycle_distribution':
    default:
      return `/groups/${groupId}`
  }
}

export function notificationIconName(type: string): NotificationIconName {
  switch (type) {
    case 'contribution_reminder':
      return 'Coins'
    case 'repayment_reminder':
      return 'CalendarClock'
    case 'default_escalation':
      return 'AlertTriangle'
    case 'cycle_distribution':
      return 'PartyPopper'
    default:
      return 'Bell'
  }
}
