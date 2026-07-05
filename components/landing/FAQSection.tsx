'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const FAQS = [
  {
    q: 'Is Ambagan a bank?',
    a: 'No. Ambagan is not a bank. We help communities organize and manage their own savings activities — like a digital version of the traditional paluwagan. We do not hold your money; funds are held on your community\'s Stellar account.',
  },
  {
    q: 'Who approves loans?',
    a: 'Community members vote on every loan request. The loan is approved only when a majority (or your group\'s configured threshold) votes in favor within a 48-hour window.',
  },
  {
    q: 'Can I join multiple communities?',
    a: 'Yes. You can be a member of multiple savings groups, each with their own settings, contributions, and loan policies.',
  },
  {
    q: 'Can communities choose their own contribution amount?',
    a: 'Yes. Each community sets its own contribution amount, cadence (weekly, biweekly, or monthly), interest rate, and vote threshold when the group is created.',
  },
  {
    q: 'What happens if someone misses a payment?',
    a: 'The system records missed contributions and outstanding balances for complete transparency. Any penalties or enforcement are up to the community\'s own agreed rules — Ambagan surfaces the information, the community decides the response.',
  },
  {
    q: 'Is my money safe on Stellar?',
    a: 'Funds are held on a shared Stellar multisig account — no single person can move funds alone. Every transaction is publicly verifiable on the Stellar blockchain. Ambagan is built on testnet for the current demo; mainnet migration is on the roadmap.',
  },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <li className="border-t-2 border-border-default first:border-t-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[16px] font-bold text-heading">{q}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-body-subtle transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-[15px] leading-[1.6] text-body">{a}</p>
      )}
    </li>
  )
}

export function FAQSection() {
  return (
    <section id="faq" className="border-t-2 border-border-default bg-neutral-primary py-24">
      <div className="mx-auto max-w-[1152px] px-6">
        <div className="mb-12 text-center">
          <h2 className="text-[24px] font-bold leading-[1.15] tracking-[-0.3px] text-heading md:text-[32px] lg:text-[36px]">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mx-auto max-w-2xl">
          <ul className="rounded-xl border-2 border-border-default bg-neutral-primary px-6 shadow-xs">
            {FAQS.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
