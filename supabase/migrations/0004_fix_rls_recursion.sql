-- Fixes "infinite recursion detected in policy for relation projects" (42P17).
--
-- projects_select referenced project_members directly, and project_members's
-- policies referenced projects directly — each SELECT on one re-triggered RLS
-- on the other, in a loop. This only ever ran under RLS (a real logged-in
-- user), never under the SQL editor or service-role clients, which is why it
-- went unnoticed until now.
--
-- Fix: wrap each cross-table check in a SECURITY DEFINER function. Owned by
-- the table owner, these bypass RLS on the table they query internally (the
-- same mechanism is_top_management/visible_user_ids already rely on for
-- profiles), so the cycle never re-enters RLS.

create or replace function is_project_member(target_project uuid, viewer uuid) returns boolean as $$
  select exists (
    select 1 from project_members where project_id = target_project and user_id = viewer
  );
$$ language sql stable security definer set search_path = public;

create or replace function project_owner_visible(target_project uuid, viewer uuid) returns boolean as $$
  select exists (
    select 1 from projects
    where id = target_project
      and owner_id in (select visible_user_ids(viewer))
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists projects_select on projects;
create policy projects_select on projects
  for select using (
    is_top_management(auth.uid())
    or owner_id in (select visible_user_ids(auth.uid()))
    or is_project_member(id, auth.uid())
  );

drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members
  for select using (
    user_id in (select visible_user_ids(auth.uid()))
    or project_owner_visible(project_id, auth.uid())
    or is_top_management(auth.uid())
  );

drop policy if exists project_members_insert on project_members;
create policy project_members_insert on project_members
  for insert with check (
    user_id in (select visible_user_ids(auth.uid()))
    and (project_owner_visible(project_id, auth.uid()) or is_top_management(auth.uid()))
  );

drop policy if exists project_members_delete on project_members;
create policy project_members_delete on project_members
  for delete using (
    project_owner_visible(project_id, auth.uid()) or is_top_management(auth.uid())
  );
