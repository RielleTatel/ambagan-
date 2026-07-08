-- Ownership model refactor.
-- Drops the wrong per-repayment interest attribution (interest_distributions,
-- total_interest_earned) and introduces contribution typing (required vs
-- optional) plus the cycle_distributions table for end-of-cycle payouts.

-- ---------------------------------------------------------------------------
-- 1. Contribution typing
-- ---------------------------------------------------------------------------

alter table public.contributions
  add column contribution_type text not null default 'required'
  check (contribution_type in ('required', 'optional'));

-- Optional investments are not tied to a cycle and have no due date.
alter table public.contributions
  alter column cycle_number drop not null,
  alter column due_date drop not null;

-- ---------------------------------------------------------------------------
-- 2. Cycle state on groups
-- ---------------------------------------------------------------------------

alter table public.groups
  add column current_cycle_number integer not null default 1,
  add column cycle_status text not null default 'active'
    check (cycle_status in ('active', 'closed'));

-- ---------------------------------------------------------------------------
-- 3. Cycle distributions
-- ---------------------------------------------------------------------------

create table public.cycle_distributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  cycle_number integer not null,
  member_id uuid references public.profiles(id) not null,
  total_contributed numeric not null,
  ownership_pct numeric not null,
  payout_amount numeric not null,
  stellar_tx_hash text,
  created_at timestamptz default now(),
  unique(group_id, cycle_number, member_id)
);

alter table public.cycle_distributions enable row level security;

create policy "Cycle distributions visible to group members"
  on public.cycle_distributions for select using (
    exists (
      select 1 from public.group_members
      where group_id = cycle_distributions.group_id and user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Remove the wrong per-repayment interest attribution
-- ---------------------------------------------------------------------------

drop table if exists public.interest_distributions cascade;

alter table public.group_members
  drop column if exists total_interest_earned;
