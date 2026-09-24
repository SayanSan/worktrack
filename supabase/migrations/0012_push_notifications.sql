-- Web Push subscriptions, for mobile/desktop notifications on task assignment
-- (including cross-team assignments from the collaboration feature).

create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_id_idx on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

create policy push_subscriptions_select on push_subscriptions
  for select using (user_id = auth.uid());

create policy push_subscriptions_insert on push_subscriptions
  for insert with check (user_id = auth.uid());

create policy push_subscriptions_delete on push_subscriptions
  for delete using (user_id = auth.uid());

-- Lets the assigner's server action fetch the *assignee's* subscriptions to
-- push to, without granting broad read access to everyone's subscriptions.
create or replace function get_push_subscriptions(target uuid)
returns table (endpoint text, p256dh text, auth text) as $$
  select endpoint, p256dh, auth from push_subscriptions where user_id = target;
$$ language sql stable security definer set search_path = public;

grant execute on function get_push_subscriptions(uuid) to authenticated;

-- Cleanup when a push service reports a subscription is gone (404/410) —
-- the sender isn't the subscription's owner, so this needs to bypass RLS too.
create or replace function delete_push_subscription(p_endpoint text) returns void as $$
  delete from push_subscriptions where endpoint = p_endpoint;
$$ language sql security definer set search_path = public;

grant execute on function delete_push_subscription(text) to authenticated;
