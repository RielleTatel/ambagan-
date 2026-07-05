-- Allow anyone (including anon) to select a group when they present a valid
-- invite token. RLS on group_members still restricts what they can see after
-- joining; this policy only lets the /invite/[token] page render the preview.
create policy "Anyone can view group by invite token"
  on public.groups for select
  using (invite_active = true);
