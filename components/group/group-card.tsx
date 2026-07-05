import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export type GroupCardProps = {
  id: string
  name: string
  description: string | null
  balance: string
  memberCount: number
}

export function GroupCard({ id, name, description, balance, memberCount }: GroupCardProps) {
  return (
    <Link href={`/groups/${id}`} className="block">
      <Card className="h-full transition hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-lg">{name}</CardTitle>
          {description && <CardDescription className="line-clamp-2">{description}</CardDescription>}
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-xs uppercase tracking-wide text-body-subtle">Fund balance</div>
              <div className="text-xl font-semibold text-heading">{balance} AMBPHP</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wide text-body-subtle">Members</div>
              <div className="text-xl font-semibold text-heading">{memberCount}</div>
            </div>
          </div>
          <span className="inline-flex w-fit rounded-full border-2 border-default-strong bg-surface px-3 py-1 text-xs font-medium text-fg-brand-strong">
            Cycle not started
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
