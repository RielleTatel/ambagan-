function FlowArrow() {
  return (
    <div className="flex justify-center py-1 text-border-default-strong">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-border-default-strong">
        <path d="M12 4v16m0 0l-5-5m5 5l5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

function Member({ name, amount }: { name: string; amount: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="rounded-xl border-2 border-border-default bg-neutral-primary px-4 py-2.5 text-center shadow-xs">
        <p className="text-sm font-bold text-heading">{name}</p>
        <p className="text-xs text-body-subtle">Monthly Contribution</p>
      </div>
      <div className="flex flex-col items-center">
        <div className="h-6 w-0.5 bg-border-default" />
        <span className="rounded-full border-2 border-border-brand-subtle bg-surface px-2 py-0.5 text-[11px] font-bold text-fg-brand-strong">
          {amount}
        </span>
        <div className="h-3 w-0.5 bg-border-default" />
      </div>
    </div>
  )
}

export function SavingsFlowDiagram() {
  return (
    <section className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            How Community Savings Grow Together
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-[17px] leading-[1.55] text-body">
            Every contribution strengthens the community fund. Borrowers repay with community-approved interest, allowing the fund to grow and benefit all members over time.
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          {/* Members contributing */}
          <div className="grid grid-cols-3 gap-4">
            <Member name="Member A" amount="₱1,000" />
            <Member name="Member B" amount="₱1,000" />
            <Member name="Member C" amount="₱1,000" />
          </div>


          {/* Community fund pool */}
          <div className="rounded-xl border-2 border-border-brand-subtle bg-surface p-6 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-brand-strong">Community Fund</p>
            <p className="mt-1 text-3xl font-bold text-heading">₱50,000</p>
            <p className="text-xs text-body-subtle">pooled by 12 members</p>
          </div>

          <FlowArrow />

          {/* Loan request */}
          <div className="rounded-xl border-2 border-border-warning-subtle bg-warning-soft p-4 text-center shadow-xs">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-warning">Loan Request Submitted</p>
            <p className="mt-0.5 text-sm text-body">Maria R. · Emergency · ₱5,000 · 6 months</p>
          </div>

          <FlowArrow />

          {/* Voting */}
          <div className="rounded-xl border-2 border-border-default bg-neutral-primary p-4 text-center shadow-xs">
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">Community Voting</p>
            <div className="mt-2 flex justify-center gap-8">
              <div className="flex items-center gap-1.5 text-sm font-bold text-fg-brand-strong">
                <span className="text-lg">✔</span> Approve
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-danger-strong">
                <span className="text-lg">✖</span> Reject
              </div>
            </div>
            <p className="mt-1.5 text-xs text-body-subtle">Majority vote · 48-hour window</p>
          </div>

          <FlowArrow />

          {/* Disbursement */}
          <div className="rounded-xl border-2 border-border-brand-subtle bg-surface p-4 text-center shadow-xs">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-brand-strong">Approved — Disbursed on Stellar</p>
            <p className="mt-0.5 text-sm font-bold text-heading">Borrower Receives ₱5,000</p>
            <p className="text-xs text-body-subtle">Transaction hash visible on ledger</p>
          </div>

          <FlowArrow />

          {/* Repayment */}
          <div className="rounded-xl border-2 border-border-default bg-neutral-primary p-4 text-center shadow-xs">
            <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">Monthly Repayment + Interest</p>
            <p className="mt-0.5 text-sm text-body">₱916/month for 6 months · 12% p.a.</p>
          </div>

          <FlowArrow />

          {/* Fund grows */}
          <div className="rounded-xl border-2 border-border-brand-subtle bg-surface p-6 text-center shadow-sm">
            <p className="text-xs font-bold uppercase tracking-widest text-fg-brand-strong">Community Fund Grows</p>
            <p className="mt-1 text-3xl font-bold text-heading">₱50,300</p>
            <p className="text-xs text-body-subtle">Interest distributed to all non-borrower members</p>
          </div>

          <div className="mt-6 text-center">
            <p className="inline-block rounded-full border-2 border-border-brand-subtle bg-surface px-5 py-2 text-sm font-bold text-fg-brand-strong">
              🌱 Shared Financial Growth
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
