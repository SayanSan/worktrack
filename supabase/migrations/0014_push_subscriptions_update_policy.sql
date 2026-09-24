-- The client re-saves an already-granted subscription on every page load via
-- .upsert(..., { onConflict: "endpoint" }) — on conflict that's an UPDATE,
-- which had no policy and was failing RLS with a 500.
create policy push_subscriptions_update on push_subscriptions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
