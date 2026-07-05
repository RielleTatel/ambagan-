const STEPS = [
  {
    number: '01',
    icon: '🏘',
    title: 'Create or Join a Community',
    desc: 'Start a new savings group or join one via an invite link. Set contribution amounts, cycle lengths, and voting rules.',
  },
  {
    number: '02',
    icon: '💸',
    title: 'Make Monthly Contributions',
    desc: 'Every member contributes their share each cycle. Payments are recorded on-chain and visible to all.',
  },
  {
    number: '03',
    icon: '📝',
    title: 'Request a Loan',
    desc: 'Any member can submit a loan request against the community fund with a purpose tag and repayment plan.',
  },
  {
    number: '04',
    icon: '🗳️',
    title: 'Members Vote',
    desc: 'The group reviews and votes to approve or deny each loan within a 48-hour window. Majority rules.',
  },
  {
    number: '05',
    icon: '🌱',
    title: 'Repay & Grow the Fund',
    desc: 'Approved borrowers repay in installments. Interest paid back goes to the community, growing everyone\'s share.',
  },
]

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Five Simple Steps
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-[17px] leading-[1.55] text-body">
            From first contribution to growing fund — here&apos;s how Ambagan works end to end.
          </p>
        </div>

        <div className="relative flex flex-col gap-0">
          {STEPS.map((step, i) => (
            <div key={step.number} className="flex gap-6">
              {/* Timeline spine */}
              <div className="flex flex-col items-center">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-border-brand-subtle bg-surface text-xl font-bold text-heading">
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="my-1 w-0.5 flex-1 bg-border-default" />
                )}
              </div>

              {/* Content */}
              <div className={`pb-${i < STEPS.length - 1 ? '8' : '0'} min-w-0 flex-1`}>
                <div className="mb-1 flex items-center gap-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-body-subtle">
                    Step {step.number}
                  </span>
                </div>
                <h3 className="text-[18px] font-bold text-heading">{step.title}</h3>
                <p className="mt-2 text-sm leading-[1.55] text-body">{step.desc}</p>
                {i < STEPS.length - 1 && <div className="h-8" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
