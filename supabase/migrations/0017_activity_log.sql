-- Org-wide activity feed for the dashboard Timeline: who created, assigned,
-- moved, completed, or deleted a task. Visible to everyone (matches the org
-- tree's visibility, not the per-task RLS scoping) since the whole point is
-- a shared, company-wide sense of who's doing what.
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references profiles(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
create index activity_log_created_at_idx on activity_log(created_at desc);

alter table activity_log enable row level security;

create policy activity_log_select on activity_log
  for select to authenticated using (true);

create policy activity_log_insert on activity_log
  for insert to authenticated with check (actor_id = auth.uid());
