import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-6 md:p-10">
      <div className="flex max-w-2xl flex-col items-center gap-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Ambagan!</h1>
        <p className="text-xl text-muted-foreground">
          A community savings and lending platform built on Stellar. Pool
          contributions with people you trust, vote democratically on loans,
          and keep every transaction verifiable on-chain.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">Create account</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Have an invite? Open the link your group administrator sent you.
        </p>
      </div>
    </main>
  );
}
