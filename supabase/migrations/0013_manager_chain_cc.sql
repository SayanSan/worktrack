-- Lets the notifyAssignee flow CC the assignee's manager(s) and boss on
-- task-assignment emails, regardless of who assigned the task or whether
-- they're in the assigner's own visible_user_ids subtree (e.g. cross-team
-- assignments) — needs to walk manager_id upward, bypassing RLS.
create or replace function manager_chain(target uuid)
returns table (id uuid, name text, email text) as $$
  with recursive chain as (
    select p.id, p.name, p.email, p.role, p.manager_id
    from profiles p
    where p.id = target

    union all

    select p.id, p.name, p.email, p.role, p.manager_id
    from profiles p
    join chain c on p.id = c.manager_id
  )
  select id, name, email from chain
  where role in ('manager', 'boss') and id <> target;
$$ language sql stable security definer set search_path = public;

grant execute on function manager_chain(uuid) to authenticated;
