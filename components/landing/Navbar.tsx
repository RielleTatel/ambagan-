'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b-2 border-border-default bg-neutral-primary shadow-xs">
      <div className="mx-auto flex max-w-[1152px] items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold text-heading tracking-tight">Ambagan!</span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-bold text-body hover:text-heading transition-colors">Features</a>
          <a href="#how-it-works" className="text-sm font-bold text-body hover:text-heading transition-colors">How It Works</a>
          <a href="#faq" className="text-sm font-bold text-body hover:text-heading transition-colors">FAQ</a>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-body transition-all [box-shadow:0_4px_0_var(--shadow-secondary)] hover:bg-neutral-secondary-medium hover:text-heading active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-secondary)]"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-xl border-2 border-transparent bg-brand px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-all [box-shadow:0_4px_0_var(--shadow-brand)] hover:bg-brand-medium active:translate-y-0.5 active:[box-shadow:0_2px_0_var(--shadow-brand)]"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden inline-flex items-center justify-center rounded-xl border-2 border-border-default p-2 text-body transition-colors hover:bg-neutral-secondary-medium"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t-2 border-border-default bg-neutral-primary px-6 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <a href="#features" onClick={() => setOpen(false)} className="text-sm font-bold text-body hover:text-heading">Features</a>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="text-sm font-bold text-body hover:text-heading">How It Works</a>
            <a href="#faq" onClick={() => setOpen(false)} className="text-sm font-bold text-body hover:text-heading">FAQ</a>
          </nav>
          <div className="mt-4 flex flex-col gap-3 border-t-2 border-border-default pt-4">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl border-2 border-border-default bg-neutral-primary px-5 py-3 text-xs font-bold uppercase tracking-widest text-body [box-shadow:0_4px_0_var(--shadow-secondary)]"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl border-2 border-transparent bg-brand px-5 py-3 text-xs font-bold uppercase tracking-widest text-white [box-shadow:0_4px_0_var(--shadow-brand)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
