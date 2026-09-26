-- Managers, Associates, Boss, and Malik (every role except Intern) can now
-- delete any task or project, not just ones they created/own or that fall
-- within their own reporting subtree — a broad cleanup capability on top of
-- the existing ownership/hierarchy-based rules (this only adds permissions,
-- never removes any of the previous ones).
create or replace function can_manage_all(viewer uuid) returns boolean as $$
  select exists (
    select 1 from profiles where id = viewer and role in ('malik', 'boss', 'manager', 'associate')
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists tasks_delete on tasks;
create policy tasks_delete on tasks
  for delete using (
    created_by in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
    or can_manage_all(auth.uid())
  );

drop policy if exists projects_delete on projects;
create policy projects_delete on projects
  for delete using (
    owner_id = auth.uid()
    or can_manage_all(auth.uid())
  );
