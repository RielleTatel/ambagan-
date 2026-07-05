export type RepaymentInstallment = {
  installmentNumber: number
  principal: number
  interest: number
  amountDue: number
}

export function computeRepaymentSchedule(
  amount: number,
  months: number,
  interestRate: number,
): RepaymentInstallment[] {
  const principalPer = amount / months
  const monthlyRate = interestRate / 12
  const totalInterest = amount * monthlyRate * months
  const interestPer = totalInterest / months
  return Array.from({ length: months }, (_, i) => ({
    installmentNumber: i + 1,
    principal: round2(principalPer),
    interest: round2(interestPer),
    amountDue: round2(principalPer + interestPer),
  }))
}

export function computeMemberLoanCeiling(
  groupBalance: number,
  memberCount: number,
): number {
  if (groupBalance <= 0 || memberCount < 1) return 0
  return round2(groupBalance / 2)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
