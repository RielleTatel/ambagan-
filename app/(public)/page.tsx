import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="min-h-svh bg-warm-bg">
      <section className="mx-auto flex min-h-svh max-w-[1152px] flex-col items-center justify-center px-6 py-24 text-center">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <span className="rounded-full border-2 border-border-brand-subtle bg-surface px-4 py-1.5 text-[13px] font-bold uppercase tracking-[0.8px] text-fg-brand-strong">
            Digital Paluwagan on Stellar
          </span>
          <h1 className="text-heading">Ambagan!</h1>
          <p className="max-w-[65ch] text-[17px] leading-[1.55] text-body md:text-[19px] md:leading-[1.6]">
            A community savings and lending platform built on Stellar. Pool
            contributions with people you trust, vote democratically on loans,
            and keep every transaction verifiable on-chain.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Get started</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
          <p className="mt-6 text-[14px] leading-[1.5] text-body-subtle">
            Have an invite? Open the link your group administrator sent you.
          </p>
        </div>
      </section>
    </main>
  );
}
