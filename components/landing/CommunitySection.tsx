const COMMUNITIES = [
  { icon: '👨‍👩‍👧‍👦', label: 'Families', desc: 'Pool savings and support each other through life events.' },
  { icon: '🏘', label: 'Neighborhood Communities', desc: 'Organize savings at the barangay or association level.' },
  { icon: '🎓', label: 'Student Organizations', desc: 'Build a shared fund for academic and org needs.' },
  { icon: '🏢', label: 'Workplace Teams', desc: 'Pooling savings together at the office or remote.' },
  { icon: '🤝', label: 'Cooperatives', desc: 'Formalize cooperative savings with full transparency.' },
  { icon: '💼', label: 'Small Businesses', desc: 'Fund shared purchases or emergency reserves together.' },
]

export function CommunitySection() {
  return (
    <section className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Designed for Communities That Save Together
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COMMUNITIES.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border-2 border-border-default bg-neutral-primary p-6 shadow-xs transition-all hover:border-border-brand-subtle hover:bg-brand-softer"
            >
              <span className="text-3xl">{c.icon}</span>
              <h3 className="mt-3 text-[18px] font-bold text-heading">{c.label}</h3>
              <p className="mt-1.5 text-sm leading-[1.55] text-body">{c.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
