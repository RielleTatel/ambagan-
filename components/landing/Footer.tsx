const FOOTER_COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Roadmap', href: '#' },
      { label: 'Security', href: '#' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'Documentation', href: '#' },
      { label: 'Support', href: '#' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Contact', href: '#' },
      { label: 'GitHub', href: 'https://github.com', target: '_blank' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t-2 border-border-default bg-neutral-primary">
      <div className="mx-auto max-w-[1152px] px-6 py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <p className="text-xs font-bold uppercase tracking-widest text-body-subtle">
                {col.heading}
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={(link as any).target}
                      rel={(link as any).target === '_blank' ? 'noreferrer' : undefined}
                      className="text-sm font-medium text-body transition-colors hover:text-heading"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t-2 border-border-default pt-8 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-heading">Ambagan!</span>
            <span className="text-xs text-body-subtle">— Community-Powered Savings</span>
          </div>
          <p className="text-xs text-body-subtle">
            Built on{' '}
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noreferrer"
              className="font-bold text-fg-brand-strong hover:underline"
            >
              Stellar
            </a>{' '}
            · {new Date().getFullYear()} Ambagan
          </p>
        </div>
      </div>
    </footer>
  )
}
