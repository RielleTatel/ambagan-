-- Ambagan initial schema
-- Base tables + spec §6.2 additions for full lifecycle and 4-stage defaults.
-- Apply via Supabase SQL Editor or `supabase db push`.

-- ---------------------------------------------------------------------------
-- Base tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  stellar_public_key text,
  stellar_secret_encrypted text,
  is_custodial boolean default true,
  credit_score integer default 500,
  created_at timestamptz default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  stellar_account_id text,
  stellar_secret_encrypted text,
  contribution_amount numeric not null,
  cadence text not null check (cadence in ('weekly', 'biweekly', 'monthly')),
  interest_rate numeric not null,
  vote_threshold text not null default 'majority'
    check (vote_threshold in ('majority', 'two_thirds', 'unanimous')),
  admin_id uuid references public.profiles(id) not null,
  invite_token text unique default gen_random_uuid()::text,
  invite_active boolean default true,
  savings_goal_name text,
  savings_goal_amount numeric,
  savings_goal_date date,
  interest_contract_id text,
  contribution_contract_id text,
  default_contract_id text,
  created_at timestamptz default now()
);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now(),
  contribution_streak integer default 0,
  total_contributed numeric default 0,
  total_interest_earned numeric default 0,
  unique(group_id, user_id)
);

create table public.contributions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  user_id uuid references public.profiles(id) not null,
  amount numeric not null,
  cycle_number integer not null,
  stellar_tx_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'late', 'missed')),
  due_date date not null,
  paid_at timestamptz,
  created_at timestamptz default now()
);

create table public.loans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.groups(id) on delete cascade not null,
  borrower_id uuid references public.profiles(id) not null,
  amount numeric not null,
  interest_rate numeric not null,
  purpose_tag text not null
    check (purpose_tag in ('emergency', 'education', 'livelihood', 'health', 'other')),
  description text,
  repayment_months integer not null,
  status text not null default 'voting'
    check (status in ('voting', 'approved', 'disbursed', 'repaid', 'defaulted', 'denied')),
  stellar_tx_hash text,
  default_stage integer default 0,
  approved_at timestamptz,
  disbursed_at timestamptz,
  voting_closes_at timestamptz not null,
  created_at timestamptz default now()
);

create table public.extension_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  reason text not null,
  proposed_due_date date not null,
  status text not null default 'voting'
    check (status in ('voting', 'approved', 'denied', 'expired')),
  voting_closes_at timestamptz not null,
  created_at timestamptz default now()
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade,
  extension_id uuid references public.extension_requests(id) on delete cascade,
  voter_id uuid references public.profiles(id) not null,
  vote text not null check (vote in ('approve', 'deny')),
  stellar_signature text,
  created_at timestamptz default now(),
  constraint votes_target_check
    check ((loan_id is not null)::int + (extension_id is not null)::int = 1)
);

create unique index votes_loan_voter_key
  on public.votes (loan_id, voter_id) where loan_id is not null;
create unique index votes_extension_voter_key
  on public.votes (extension_id, voter_id) where extension_id is not null;

create table public.repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  installment_number integer not null,
  amount_due numeric not null,
  principal numeric not null,
  interest numeric not null,
  due_date date not null,
  paid_at timestamptz,
  stellar_tx_hash text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'late', 'missed'))
);

create table public.default_resolutions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  action text not null check (action in ('waive', 'partial_settle', 'dispute')),
  settled_amount numeric,
  loss_amount numeric not null,
  admin_id uuid references public.profiles(id) not null,
  soroban_tx_hash text,
  created_at timestamptz default now()
);

create table public.loss_distributions (
  id uuid primary key default gen_random_uuid(),
  resolution_id uuid references public.default_resolutions(id) on delete cascade not null,
  member_id uuid references public.profiles(id) not null,
  share_amount numeric not null,
  created_at timestamptz default now()
);

create table public.interest_distributions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid references public.loans(id) on delete cascade not null,
  member_id uuid references public.profiles(id) not null,
  amount numeric not null,
  soroban_tx_hash text not null,
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  group_id uuid references public.groups(id),
  type text not null,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- Auto-create profile on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.contributions enable row level security;
alter table public.loans enable row level security;
alter table public.extension_requests enable row level security;
alter table public.votes enable row level security;
alter table public.repayments enable row level security;
alter table public.default_resolutions enable row level security;
alter table public.loss_distributions enable row level security;
alter table public.interest_distributions enable row level security;
alter table public.notifications enable row level security;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Groups
create policy "Members can view their groups"
  on public.groups for select using (
    exists (
      select 1 from public.group_members
      where group_id = id and user_id = auth.uid()
    )
    or admin_id = auth.uid()
  );
create policy "Authenticated users can create groups"
  on public.groups for insert with check (auth.uid() = admin_id);
create policy "Admin can update group"
  on public.groups for update using (admin_id = auth.uid());

-- Group members
create policy "Group members visible to members"
  on public.group_members for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_id and gm.user_id = auth.uid()
    )
  );
create policy "Users can join groups"
  on public.group_members for insert with check (auth.uid() = user_id);

-- Contributions
create policy "Contributions visible to group members"
  on public.contributions for select using (
    exists (
      select 1 from public.group_members
      where group_id = contributions.group_id and user_id = auth.uid()
    )
  );
create policy "Members can insert contributions"
  on public.contributions for insert with check (auth.uid() = user_id);

-- Loans
create policy "Loans visible to group members"
  on public.loans for select using (
    exists (
      select 1 from public.group_members
      where group_id = loans.group_id and user_id = auth.uid()
    )
  );
create policy "Members can request loans"
  on public.loans for insert with check (auth.uid() = borrower_id);

-- Extension requests
create policy "Extension requests visible to group members"
  on public.extension_requests for select using (
    exists (
      select 1
      from public.loans l
      join public.group_members gm on gm.group_id = l.group_id
      where l.id = loan_id and gm.user_id = auth.uid()
    )
  );
create policy "Borrower can create extension request"
  on public.extension_requests for insert with check (
    exists (
      select 1 from public.loans l
      where l.id = loan_id and l.borrower_id = auth.uid()
    )
  );

-- Votes
create policy "Votes visible to group members"
  on public.votes for select using (
    exists (
      select 1 from public.loans l
      join public.group_members gm on l.group_id = gm.group_id
      where l.id = votes.loan_id and gm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.extension_requests er
      join public.loans l on l.id = er.loan_id
      join public.group_members gm on gm.group_id = l.group_id
      where er.id = votes.extension_id and gm.user_id = auth.uid()
    )
  );
create policy "Members can vote"
  on public.votes for insert with check (auth.uid() = voter_id);

-- Repayments
create policy "Repayments visible to group members"
  on public.repayments for select using (
    exists (
      select 1 from public.loans l
      join public.group_members gm on l.group_id = gm.group_id
      where l.id = loan_id and gm.user_id = auth.uid()
    )
  );

-- Default resolutions
create policy "Default resolutions visible to group members"
  on public.default_resolutions for select using (
    exists (
      select 1 from public.loans l
      join public.group_members gm on l.group_id = gm.group_id
      where l.id = loan_id and gm.user_id = auth.uid()
    )
  );
create policy "Admin can insert resolution"
  on public.default_resolutions for insert with check (
    exists (
      select 1 from public.loans l
      join public.groups g on g.id = l.group_id
      where l.id = loan_id and g.admin_id = auth.uid()
    )
  );

-- Loss distributions
create policy "Loss distributions visible to affected member"
  on public.loss_distributions for select using (
    member_id = auth.uid()
    or exists (
      select 1
      from public.default_resolutions dr
      join public.loans l on l.id = dr.loan_id
      join public.group_members gm on gm.group_id = l.group_id
      where dr.id = resolution_id and gm.user_id = auth.uid()
    )
  );

-- Interest distributions
create policy "Interest distributions visible to group members"
  on public.interest_distributions for select using (
    exists (
      select 1 from public.loans l
      join public.group_members gm on l.group_id = gm.group_id
      where l.id = loan_id and gm.user_id = auth.uid()
    )
  );

-- Notifications
create policy "Users see own notifications"
  on public.notifications for select using (auth.uid() = user_id);
create policy "Users can mark own notifications read"
  on public.notifications for update using (auth.uid() = user_id);
