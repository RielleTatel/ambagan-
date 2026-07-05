const TRUST_PILLARS = [
  {
    icon: '📒',
    title: 'Real-Time Ledger',
    desc: 'Every transaction is recorded on Stellar and visible to all group members the moment it happens. No hidden balances.',
  },
  {
    icon: '🗳️',
    title: 'Community Decisions',
    desc: 'Loans require a majority vote from members before funds are moved. No admin can disburse unilaterally.',
  },
  {
    icon: '🔒',
    title: 'Secure Platform',
    desc: 'Protected accounts, verified member identities, and financial records backed by Stellar blockchain technology.',
  },
]

export function TrustSection() {
  return (
    <section className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Built Around Transparency
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-[17px] leading-[1.55] text-body">
            Trust isn&apos;t assumed — it&apos;s built into every decision and every transaction.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TRUST_PILLARS.map((p) => (
            <div key={p.title} className="rounded-xl border-2 border-border-default bg-neutral-primary p-8 text-center shadow-xs">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-border-brand-subtle bg-surface text-2xl">
                {p.icon}
              </div>
              <h3 className="mt-5 text-[18px] font-bold text-heading">{p.title}</h3>
              <p className="mt-3 text-sm leading-[1.55] text-body">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
