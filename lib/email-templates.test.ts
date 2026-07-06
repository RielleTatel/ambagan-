import { describe, it, expect } from 'vitest'
import { renderTemplate } from './email-templates'

describe('renderTemplate — contribution_reminder', () => {
  const result = renderTemplate('contribution_reminder', {
    fullName: 'Ana Reyes',
    amount: '500',
    groupName: 'Barangay 42',
    dueDate: '2026-07-10',
    groupUrl: 'https://example.com/groups/1',
  })

  it('returns the correct subject', () => {
    expect(result.subject).toBe('Your Barangay 42 contribution is due')
  })

  it('html contains the member name', () => {
    expect(result.html).toContain('Ana Reyes')
  })

  it('html contains the amount', () => {
    expect(result.html).toContain('500')
  })

  it('html contains the group name', () => {
    expect(result.html).toContain('Barangay 42')
  })

  it('html contains the due date', () => {
    expect(result.html).toContain('2026-07-10')
  })

  it('html contains the group url', () => {
    expect(result.html).toContain('https://example.com/groups/1')
  })

  it('html contains the Ambagan brand color', () => {
    expect(result.html).toContain('#1A4731')
  })
})

describe('renderTemplate — repayment_reminder', () => {
  const result = renderTemplate('repayment_reminder', {
    fullName: 'Ben Cruz',
    amount: '1200',
    installmentNumber: '3',
    groupName: 'Kumain Tayo',
    dueDate: '2026-08-01',
    repayUrl: 'https://example.com/loans/5/repay',
  })

  it('returns the correct subject', () => {
    expect(result.subject).toBe('Loan installment due — Kumain Tayo')
  })

  it('html contains the borrower name', () => {
    expect(result.html).toContain('Ben Cruz')
  })

  it('html contains the installment number', () => {
    expect(result.html).toContain('3')
  })

  it('html contains the amount', () => {
    expect(result.html).toContain('1200')
  })

  it('html contains the due date', () => {
    expect(result.html).toContain('2026-08-01')
  })
})

describe('renderTemplate — vote_opened', () => {
  const result = renderTemplate('vote_opened', {
    groupName: 'Sindikato Fund',
    loansUrl: 'https://example.com/groups/2/loans',
  })

  it('returns the correct subject', () => {
    expect(result.subject).toBe('Vote requested: loan in Sindikato Fund')
  })

  it('html contains the loans url', () => {
    expect(result.html).toContain('https://example.com/groups/2/loans')
  })
})

describe('renderTemplate — loan_decision', () => {
  const result = renderTemplate('loan_decision', {
    outcome: 'approved',
    groupName: 'Barangay 42',
    loanUrl: 'https://example.com/loans/7',
  })

  it('returns a subject containing outcome and group name', () => {
    expect(result.subject).toContain('approved')
    expect(result.subject).toContain('Barangay 42')
  })

  it('html contains the outcome', () => {
    expect(result.html).toContain('approved')
  })

  it('html contains the loan url', () => {
    expect(result.html).toContain('https://example.com/loans/7')
  })
})

describe('renderTemplate — default_escalation', () => {
  const result = renderTemplate('default_escalation', {
    groupName: 'Paluwagan Pro',
    stage: '2',
    daysPastDue: '15',
    groupUrl: 'https://example.com/groups/3',
  })

  it('returns the correct subject', () => {
    expect(result.subject).toBe('Loan entered stage 2')
  })

  it('html contains the group name', () => {
    expect(result.html).toContain('Paluwagan Pro')
  })

  it('html contains the stage number', () => {
    expect(result.html).toContain('stage 2')
  })

  it('html contains days past due', () => {
    expect(result.html).toContain('15')
  })

  it('html contains the group url', () => {
    expect(result.html).toContain('https://example.com/groups/3')
  })
})

describe('renderTemplate — HTML escaping', () => {
  it('escapes < > & in user-supplied data', () => {
    const result = renderTemplate('contribution_reminder', {
      fullName: '<script>alert(1)</script>',
      amount: '500',
      groupName: 'Safe Group',
      dueDate: '2026-07-10',
      groupUrl: 'https://example.com',
    })
    expect(result.html).not.toContain('<script>')
    expect(result.html).toContain('&lt;script&gt;')
  })
})
