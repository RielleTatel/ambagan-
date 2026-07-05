'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createGroup, type CreateGroupInput } from './actions'

export default function CreateGroupForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    const input: CreateGroupInput = {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? '') || undefined,
      contributionAmount: Number(fd.get('contributionAmount')),
      cadence: fd.get('cadence') as CreateGroupInput['cadence'],
      interestRate: Number(fd.get('interestRate')),
      voteThreshold: fd.get('voteThreshold') as CreateGroupInput['voteThreshold'],
      savingsGoalName: String(fd.get('savingsGoalName') ?? '') || undefined,
      savingsGoalAmount: fd.get('savingsGoalAmount') ? Number(fd.get('savingsGoalAmount')) : undefined,
      savingsGoalDate: String(fd.get('savingsGoalDate') ?? '') || undefined,
    }
    startTransition(async () => {
      const res = await createGroup(input)
      if (res && 'error' in res) setError(res.error)
      // Success path redirects server-side; nothing to do here.
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create a new group</CardTitle>
        <CardDescription>
          Set up your paluwagan. You&apos;ll be the first member and admin.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-2">
            <Label htmlFor="name">Group name</Label>
            <Input id="name" name="name" required maxLength={80} placeholder="Barangay Savings Circle" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input id="description" name="description" maxLength={500} placeholder="What is this group for?" />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="contributionAmount">Contribution amount (AMBPHP)</Label>
            <Input id="contributionAmount" name="contributionAmount" type="number" min="1" step="1" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cadence">Cadence</Label>
            <select
              id="cadence"
              name="cadence"
              required
              defaultValue="monthly"
              className="h-10 rounded-[12px] border-2 border-border-default bg-neutral-primary px-3 text-sm text-heading transition-[border-color] duration-150 ease-out hover:border-border-default-strong focus-visible:outline-none focus-visible:border-border-brand focus-visible:ring-2 focus-visible:ring-brand-soft"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="interestRate">Interest rate (% per month, 0–10)</Label>
            <Input
              id="interestRate"
              name="interestRate"
              type="number"
              min="0"
              max="10"
              step="0.1"
              required
              defaultValue="2"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="voteThreshold">Vote threshold</Label>
            <select
              id="voteThreshold"
              name="voteThreshold"
              required
              defaultValue="majority"
              className="h-10 rounded-[12px] border-2 border-border-default bg-neutral-primary px-3 text-sm text-heading transition-[border-color] duration-150 ease-out hover:border-border-default-strong focus-visible:outline-none focus-visible:border-border-brand focus-visible:ring-2 focus-visible:ring-brand-soft"
            >
              <option value="majority">Majority (&gt;50%)</option>
              <option value="two_thirds">Two-thirds (≥66%)</option>
              <option value="unanimous">Unanimous (100%)</option>
            </select>
          </div>

          <fieldset className="grid gap-3 rounded-[12px] border-2 border-border-default p-4">
            <legend className="px-2 text-sm text-body-subtle">Savings goal (optional)</legend>
            <div className="grid gap-2">
              <Label htmlFor="savingsGoalName">Goal name</Label>
              <Input id="savingsGoalName" name="savingsGoalName" maxLength={80} placeholder="Community medical fund" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="savingsGoalAmount">Goal amount (AMBPHP)</Label>
              <Input id="savingsGoalAmount" name="savingsGoalAmount" type="number" min="1" step="1" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="savingsGoalDate">Goal date</Label>
              <Input id="savingsGoalDate" name="savingsGoalDate" type="date" />
            </div>
          </fieldset>

          {error && <p className="text-sm font-medium text-danger-strong">{error}</p>}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Creating group…' : 'Create group'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
