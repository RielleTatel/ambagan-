'use client'

import { useState, useTransition } from 'react'
import { Loader2 } from 'lucide-react'
import {
  updateGroupSettings,
  type GroupSettingsInput,
} from './actions'

export function SettingsForm({ initial }: { initial: GroupSettingsInput }) {
  const [form, setForm] = useState<GroupSettingsInput>(initial)
  const [pending, startTransition] = useTransition()
  const [status, setStatus] = useState<
    { kind: 'idle' } | { kind: 'ok' } | { kind: 'err'; error: string }
  >({ kind: 'idle' })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus({ kind: 'idle' })
    startTransition(async () => {
      const result = await updateGroupSettings(form)
      if (result.ok) setStatus({ kind: 'ok' })
      else setStatus({ kind: 'err', error: result.error })
    })
  }

  function set<K extends keyof GroupSettingsInput>(
    key: K,
    value: GroupSettingsInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  const inputCls =
    'w-full rounded-xl border-2 border-border-default bg-warm-bg px-4 py-3 text-sm font-medium text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft'
  const labelCls =
    'text-xs font-bold uppercase tracking-widest text-body-subtle'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label className={labelCls}>Name</label>
        <input
          className={inputCls}
          type="text"
          maxLength={80}
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelCls}>Description</label>
        <textarea
          className={`${inputCls} min-h-[80px]`}
          maxLength={500}
          value={form.description ?? ''}
          onChange={(e) => set('description', e.target.value || null)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className={labelCls}>Contribution amount (AMBPHP)</label>
          <input
            className={inputCls}
            type="number"
            min={1}
            max={1_000_000}
            value={form.contributionAmount}
            onChange={(e) => set('contributionAmount', Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Cadence</label>
          <select
            className={inputCls}
            value={form.cadence}
            onChange={(e) =>
              set('cadence', e.target.value as GroupSettingsInput['cadence'])
            }
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Interest rate (% / month)</label>
          <input
            className={inputCls}
            type="number"
            step="0.1"
            min={0}
            max={10}
            value={form.interestRate}
            onChange={(e) => set('interestRate', Number(e.target.value))}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className={labelCls}>Vote threshold</label>
          <select
            className={inputCls}
            value={form.voteThreshold}
            onChange={(e) =>
              set(
                'voteThreshold',
                e.target.value as GroupSettingsInput['voteThreshold'],
              )
            }
          >
            <option value="majority">Majority</option>
            <option value="two_thirds">Two-thirds</option>
            <option value="unanimous">Unanimous</option>
          </select>
        </div>
      </div>

      <div className="border-t-2 border-border-default pt-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-body-subtle">
          Savings goal (optional)
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <input
            className={inputCls}
            type="text"
            placeholder="Name"
            maxLength={80}
            value={form.savingsGoalName ?? ''}
            onChange={(e) =>
              set('savingsGoalName', e.target.value || null)
            }
          />
          <input
            className={inputCls}
            type="number"
            placeholder="Amount"
            min={0}
            value={form.savingsGoalAmount ?? ''}
            onChange={(e) =>
              set(
                'savingsGoalAmount',
                e.target.value ? Number(e.target.value) : null,
              )
            }
          />
          <input
            className={inputCls}
            type="date"
            value={form.savingsGoalDate ?? ''}
            onChange={(e) =>
              set('savingsGoalDate', e.target.value || null)
            }
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className={[
            'inline-flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-3 text-sm font-bold uppercase tracking-widest transition-all duration-100',
            pending
              ? 'cursor-not-allowed border-border-default bg-disabled text-fg-disabled shadow-none'
              : 'border-transparent bg-brand text-white [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]',
          ].join(' ')}
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save settings
        </button>
        {status.kind === 'ok' && (
          <p className="text-xs font-semibold text-fg-brand-strong">Saved.</p>
        )}
        {status.kind === 'err' && (
          <p className="text-xs font-semibold text-danger-strong">
            {status.error}
          </p>
        )}
      </div>
    </form>
  )
}
