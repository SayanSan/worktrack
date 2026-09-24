-- The org chart on /team should show the whole company to everyone, not
-- just each viewer's own visible_user_ids slice — profiles_select stays as
-- narrowly scoped as before for every other use (emails, directory, etc.),
-- this is a dedicated, narrow bypass exposing only what the tree needs.
create or replace function org_tree_profiles()
returns table (id uuid, name text, role user_role, manager_id uuid) as $$
  select id, name, role, manager_id from profiles;
$$ language sql stable security definer set search_path = public;

grant execute on function org_tree_profiles() to authenticated;
