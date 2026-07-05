import Link from 'next/link'

export function CTASection() {
  return (
    <section className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="rounded-xl border-2 border-border-brand-subtle bg-surface p-12 text-center shadow-sm">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Ready to Build Financial Trust Together?
          </h2>
          <p className="mx-auto mt-4 max-w-[60ch] text-[17px] leading-[1.55] text-body">
            Whether you&apos;re organizing a family savings group or managing a cooperative, Ambagan gives your community the tools to save, lend, and grow with confidence.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-transparent bg-brand px-8 py-4 text-sm font-bold uppercase tracking-widest text-white transition-all [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
            >
              🟢 Get Started
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border-2 border-border-default bg-neutral-primary px-8 py-4 text-sm font-bold uppercase tracking-widest text-body transition-all [box-shadow:0_4px_0_var(--shadow-secondary)] hover:bg-neutral-secondary-medium hover:text-heading active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-secondary)]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
