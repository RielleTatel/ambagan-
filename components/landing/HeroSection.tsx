import Link from 'next/link'

function DashboardMockup() {
  return (
    <div className="w-full max-w-sm rounded-xl border-2 border-border-default bg-neutral-primary shadow-md">
      {/* Mockup header */}
      <div className="flex items-center justify-between border-b-2 border-border-default px-5 py-3.5">
        <span className="text-sm font-bold text-heading">Community Fund</span>
        <span className="rounded-full border-2 border-border-brand-subtle bg-surface px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-fg-brand-strong">Live</span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        {/* Balance */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">Community Balance</p>
          <p className="mt-1 text-3xl font-bold text-heading">₱50,000</p>
          <p className="text-xs text-body-subtle">AMBPHP · Stellar Testnet</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border-2 border-border-default bg-warm-bg p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">Members</p>
            <p className="mt-0.5 text-xl font-bold text-heading">12</p>
          </div>
          <div className="rounded-xl border-2 border-border-brand-subtle bg-surface p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-fg-brand-strong">Cycle</p>
            <p className="mt-0.5 text-xl font-bold text-heading">4 / 12</p>
          </div>
        </div>

        {/* Contribution progress */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-body-subtle">Contributions</p>
            <p className="text-xs font-bold text-fg-brand-strong">10 of 12 paid</p>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full border-2 border-border-default bg-warm-bg">
            <div className="h-full rounded-full bg-brand" style={{ width: '83%' }} />
          </div>
        </div>

        {/* Loan requests */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-body-subtle">Loan Requests</p>
          <ul className="flex flex-col gap-1.5">
            <li className="flex items-center justify-between rounded-xl border-2 border-border-warning-subtle bg-warning-soft px-3 py-2 text-xs">
              <span className="font-semibold text-heading">Maria R.</span>
              <span className="font-bold text-fg-warning">₱5,000 · Voting</span>
            </li>
            <li className="flex items-center justify-between rounded-xl border-2 border-border-brand-subtle bg-surface px-3 py-2 text-xs">
              <span className="font-semibold text-heading">Juan D.</span>
              <span className="font-bold text-fg-brand-strong">₱3,000 · Repaying</span>
            </li>
          </ul>
        </div>

        {/* Activity */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-body-subtle">Recent Activity</p>
          <ul className="flex flex-col gap-1">
            {['Ana M. contributed', 'Carlo S. contributed', 'Vote cast on loan'].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-body">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function HeroSection() {
  return (
    <section className="bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:gap-24">
          {/* Left: text */}
          <div className="flex max-w-xl flex-col items-start gap-6">
            {/* Badge */}
            <span className="rounded-full border-2 border-border-brand-subtle bg-surface px-4 py-1.5 text-[13px] font-bold uppercase tracking-[0.8px] text-fg-brand-strong">
              🇵🇭 Community-Powered Savings Platform
            </span>

            <h1 className="text-[28px] font-bold leading-[1.1] tracking-[-0.4px] text-heading md:text-[36px] lg:text-[48px]">
              Save Together.{' '}
              <span className="text-brand">Borrow Together.</span>{' '}
              Grow Together.
            </h1>

            <p className="text-[17px] leading-[1.55] text-body md:text-[19px] md:leading-[1.6]">
              Ambagan modernizes the traditional Filipino paluwagan by providing a secure platform where communities can save collectively, approve loans democratically, and grow their shared funds transparently.
            </p>
            <p className="text-[17px] leading-[1.55] text-body">
              Whether you&apos;re saving with friends, coworkers, families, student organizations, or neighborhood associations, Ambagan keeps every member informed and every contribution accountable.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-transparent bg-brand px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-all [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
              >
                🟢 Get Started
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-border-default bg-neutral-primary px-6 py-3.5 text-sm font-bold uppercase tracking-widest text-body transition-all [box-shadow:0_4px_0_var(--shadow-secondary)] hover:bg-neutral-secondary-medium hover:text-heading active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-secondary)]"
              >
                Sign In
              </Link>
            </div>

            <p className="text-sm text-body-subtle">
              Have an invite? Open the link your group admin sent you.
            </p>
          </div>

          {/* Right: dashboard mockup */}
          <div className="flex w-full shrink-0 justify-center lg:w-auto">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  )
}
