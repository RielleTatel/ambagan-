-- Fix infinite recursion in group_members SELECT policy.
--
-- The original policy in 0001_initial.sql self-referenced group_members inside
-- an EXISTS subquery. Postgres re-applies RLS to the inner query, which invokes
-- the same policy, which recurses forever.
--
-- Solution: put the membership check inside a SECURITY DEFINER function so the
-- inner query runs with the function owner's privileges and skips RLS on that
-- one lookup. Callers still hit RLS on their outer SELECT.

create or replace function public.is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  )
$$;

-- Replace the broken policy.
drop policy if exists "Group members visible to members" on public.group_members;

create policy "Group members visible to members"
  on public.group_members for select
  using (public.is_group_member(group_id));

-- Also patch other tables whose "visible to group members" policies use the
-- same recursive EXISTS pattern against group_members. The recursion only
-- triggers when the outer query is on group_members itself, but rewriting
-- these to use the helper is cleaner and future-proofs against similar bugs.

drop policy if exists "Members can view their groups" on public.groups;
create policy "Members can view their groups"
  on public.groups for select
  using (public.is_group_member(id) or admin_id = auth.uid());
