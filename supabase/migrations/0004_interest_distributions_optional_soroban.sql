-- Phase 6 scope adjustment: interest distribution is a backend calculation
-- for the hackathon (no Soroban). The soroban_tx_hash column stays for
-- post-hackathon on-chain payouts but must be optional.

alter table public.interest_distributions
  alter column soroban_tx_hash drop not null;
