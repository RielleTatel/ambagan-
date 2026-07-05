const FEATURES = [
  {
    icon: '💰',
    title: 'Community Savings',
    desc: 'Monthly contributions from every member flow into a shared community fund managed collectively.',
  },
  {
    icon: '🗳️',
    title: 'Democratic Loan Approval',
    desc: 'Members vote before any loan is approved. No single person controls the fund.',
  },
  {
    icon: '📒',
    title: 'Transparent Ledger',
    desc: 'Every contribution, disbursement, and repayment is visible to all group members in real time.',
  },
  {
    icon: '📈',
    title: 'Interest-Based Growth',
    desc: 'Borrowers repay with community-agreed interest rates, growing the shared fund over time.',
  },
  {
    icon: '🔔',
    title: 'Notifications',
    desc: 'Stay updated on contributions, repayments, and open votes — never miss a community event.',
  },
  {
    icon: '🔒',
    title: 'Secure Accounts',
    desc: 'Protected authentication, verified members, and on-chain transaction records via Stellar.',
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Everything Your Community Needs, In One Place.
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-[17px] leading-[1.55] text-body">
            Built specifically for Filipino savings culture — with the transparency and accountability every group deserves.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-border-brand-subtle bg-surface text-2xl">
                {f.icon}
              </div>
              <h3 className="mt-4 text-[18px] font-bold text-heading">{f.title}</h3>
              <p className="mt-2 text-sm leading-[1.55] text-body">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
