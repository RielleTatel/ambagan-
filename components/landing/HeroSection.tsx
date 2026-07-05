import Image from 'next/image'
import Link from 'next/link'

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

          {/* Right: mascot — hidden on mobile */}
          <div className="hidden lg:flex w-full shrink-0 items-center justify-center lg:w-auto">
            <Image
              src="/assets/mascot.png"
              alt="Ambagan mascot"
              width={320}
              height={320}
              priority
              className="select-none"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
