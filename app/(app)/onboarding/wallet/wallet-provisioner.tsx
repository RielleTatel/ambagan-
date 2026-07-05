"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Status = "provisioning" | "error";

interface WalletProvisionerProps {
  inviteToken?: string;
}

export function WalletProvisioner({ inviteToken }: WalletProvisionerProps) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("provisioning");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const provision = async () => {
    setStatus("provisioning");
    setError(null);
    try {
      const res = await fetch("/api/stellar/account", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to provision Stellar wallet");
      }
      const redirectPath = inviteToken ? `/invite/${inviteToken}` : "/dashboard";
      router.push(redirectPath);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    provision();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Setting up your wallet</CardTitle>
        <CardDescription>
          We&apos;re creating your Stellar account and funding it on testnet.
          This takes a few seconds.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "provisioning" && (
          <p className="text-[14px] leading-[1.5] text-body">
            Generating keypair, funding via Friendbot, setting up your AMBPHP
            trustline...
          </p>
        )}
        {status === "error" && (
          <div className="flex flex-col gap-4">
            <p className="text-[14px] font-medium text-danger-strong">
              {error}
            </p>
            <Button onClick={provision}>Try again</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
