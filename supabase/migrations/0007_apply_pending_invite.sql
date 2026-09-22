-- Self-healing placeholder accounts.
--
-- A pre-authorized invite normally applies during handle_new_user() on first
-- sign-up. But if someone signed in *before* their invite existed, they got a
-- default intern profile and the later invite never took effect. This function
-- re-applies a pending invite to the caller on any login (called from the auth
-- callback), so a placeholder invite grants the right role whenever the real
-- person finally logs in — regardless of order.
--
-- Only upgrades a still-default intern, so it can never demote a provisioned
-- user, and it consumes the invite only when actually applied.
create or replace function apply_pending_invite() returns void as $$
declare
  my_email text;
  inv invites%rowtype;
begin
  select email into my_email from profiles where id = auth.uid();
  if my_email is null then return; end if;

  select * into inv from invites where email = lower(my_email);
  if not found then return; end if;

  perform set_config('app.bypass_role_guard', 'on', true);
  update profiles
     set role = inv.role,
         manager_id = coalesce(inv.manager_id, manager_id)
   where id = auth.uid() and role = 'intern';

  if found then
    delete from invites where email = inv.email;
  end if;
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function apply_pending_invite() to authenticated;
