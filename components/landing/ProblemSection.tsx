const PROBLEMS = [
  {
    icon: '📋',
    title: 'Manual Tracking',
    points: [
      'Spreadsheets, notebooks, and Messenger chats.',
      'Information gets lost or forgotten.',
      'No single source of truth for the group.',
    ],
  },
  {
    icon: '🔍',
    title: 'Limited Transparency',
    points: [
      'Members struggle to see contributions, balances, and repayments.',
      'Uncertainty and disputes arise from incomplete records.',
      'No clear audit trail when questions come up.',
    ],
  },
  {
    icon: '🤲',
    title: 'Trust Without Visibility',
    points: [
      'Traditional savings rely heavily on personal trust.',
      'Trust grows stronger when everyone has visibility.',
      'The fund needs accountability, not just good intentions.',
    ],
  },
]

export function ProblemSection() {
  return (
    <section className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Managing Community Savings Shouldn&apos;t Be Complicated.
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-[17px] leading-[1.55] text-body">
            Traditional paluwagan runs on trust and paper — and that&apos;s where things go wrong.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PROBLEMS.map((p) => (
            <div key={p.title} className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs">
              <span className="text-3xl">{p.icon}</span>
              <h3 className="mt-4 text-[18px] font-bold text-heading">{p.title}</h3>
              <ul className="mt-3 flex flex-col gap-2">
                {p.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-[1.55] text-body">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-border-default-strong" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
