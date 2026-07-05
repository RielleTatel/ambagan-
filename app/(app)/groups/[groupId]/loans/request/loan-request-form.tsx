'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { computeRepaymentSchedule } from '@/lib/loan-math'
import { requestLoan, type PurposeTag } from '../actions'

const PURPOSE_OPTIONS: { value: PurposeTag; label: string; color: string }[] = [
  { value: 'emergency', label: 'Emergency', color: 'border-border-danger bg-danger-soft text-danger-strong' },
  { value: 'education', label: 'Education',  color: 'border-[#3B8FB5] bg-[#EBF5FA] text-[#3B8FB5]' },
  { value: 'livelihood', label: 'Livelihood', color: 'border-border-brand-subtle bg-surface text-fg-brand-strong' },
  { value: 'health', label: 'Health',       color: 'border-[#C96B8A] bg-[#FAEEF3] text-[#C96B8A]' },
  { value: 'other', label: 'Other',         color: 'border-border-default bg-warm-bg text-body-subtle' },
]

const inputCls =
  'w-full rounded-xl border-2 border-border-default bg-neutral-primary px-4 py-3 text-base text-heading placeholder:text-body-subtle transition-colors focus:border-border-brand focus:outline-none focus:ring-2 focus:ring-brand-soft hover:border-border-default-strong'

const labelCls = 'mb-2 block text-xs font-bold uppercase tracking-wide text-heading'

export function LoanRequestForm({
  groupId,
  ceiling,
  interestRate,
}: {
  groupId: string
  ceiling: number
  interestRate: number
}) {
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState<PurposeTag>('emergency')
  const [description, setDescription] = useState('')
  const [months, setMonths] = useState('6')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const schedule = useMemo(() => {
    const a = Number(amount)
    const m = Number(months)
    if (!a || !m || a <= 0 || m <= 0) return []
    return computeRepaymentSchedule(a, m, interestRate)
  }, [amount, months, interestRate])

  const total = schedule.reduce((acc, s) => acc + s.amountDue, 0)

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const a = Number(amount)
    if (!a || a <= 0) return setError('Enter an amount greater than 0.')
    if (a > ceiling) return setError(`Amount exceeds your ceiling of ${ceiling} AMBPHP.`)
    if (!description.trim()) return setError('Description is required.')

    startTransition(async () => {
      const result = await requestLoan({
        groupId,
        amount: a,
        purposeTag: purpose,
        description: description.trim(),
        repaymentMonths: Number(months),
      })
      if (result.ok) router.push(`/groups/${groupId}/loans`)
      else setError(result.error)
    })
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {/* Amount */}
      <div>
        <label htmlFor="loan-amount" className={labelCls}>
          Amount (AMBPHP)
        </label>
        <input
          id="loan-amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={inputCls}
          placeholder={`Max ${ceiling}`}
          max={ceiling}
          min={1}
        />
      </div>

      {/* Purpose */}
      <div>
        <p className={labelCls}>Purpose</p>
        <div className="flex flex-wrap gap-2">
          {PURPOSE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPurpose(opt.value)}
              className={[
                'rounded-full border-2 px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-all',
                purpose === opt.value
                  ? opt.color + ' [box-shadow:0_3px_0_rgba(0,0,0,0.12)]'
                  : 'border-border-default bg-neutral-primary text-body-subtle hover:border-border-default-strong',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="loan-desc" className={labelCls}>
          Description
        </label>
        <textarea
          id="loan-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          rows={3}
          placeholder="Explain why you need this loan…"
        />
      </div>

      {/* Repayment months */}
      <div>
        <label htmlFor="loan-months" className={labelCls}>
          Repayment period (months)
        </label>
        <input
          id="loan-months"
          type="number"
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className={inputCls}
          min={1}
          max={24}
        />
      </div>

      {/* Live schedule preview */}
      {schedule.length > 0 && (
        <div className="rounded-xl border-2 border-border-default bg-neutral-primary shadow-xs">
          <div className="border-b-2 border-border-default px-5 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-heading">Repayment preview</p>
          </div>
          <ul className="divide-y-2 divide-border-default">
            {schedule.map((s) => (
              <li key={s.installmentNumber} className="flex items-center justify-between px-5 py-2.5 text-sm">
                <span className="text-body-subtle">Month {s.installmentNumber}</span>
                <div className="text-right">
                  <span className="font-semibold text-heading">{s.amountDue} AMBPHP</span>
                  <span className="ml-2 text-xs text-body-subtle">
                    P {s.principal} + I {s.interest}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t-2 border-border-default px-5 py-3">
            <span className="text-xs font-bold uppercase tracking-wide text-body-subtle">Total repayable</span>
            <span className="font-bold text-heading">{total.toFixed(2)} AMBPHP</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border-2 border-border-danger bg-danger-soft px-4 py-3 text-sm font-medium text-danger-strong">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3.5',
          'text-sm font-bold uppercase tracking-widest transition-all duration-100',
          'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft',
          pending
            ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled'
            : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
        ].join(' ')}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? 'Submitting…' : 'Submit request'}
      </button>
    </form>
  )
}
