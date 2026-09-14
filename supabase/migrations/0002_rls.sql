-- WorkTrack row level security
-- Visibility follows the reporting hierarchy (profiles.manager_id):
--   malik/boss see everyone; everyone else sees themselves + everyone below them.

alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;

create or replace function is_top_management(viewer uuid) returns boolean as $$
  select exists (
    select 1 from profiles where id = viewer and role in ('malik', 'boss')
  );
$$ language sql stable security definer set search_path = public;

create or replace function visible_user_ids(viewer uuid) returns setof uuid as $$
  with recursive descendants as (
    select id from profiles where id = viewer
    union all
    select p.id from profiles p join descendants d on p.manager_id = d.id
  )
  select id from profiles where is_top_management(viewer)
  union
  select id from descendants where not is_top_management(viewer);
$$ language sql stable security definer set search_path = public;

-- PROFILES ---------------------------------------------------------------

create policy profiles_select on profiles
  for select using (id in (select visible_user_ids(auth.uid())));

create policy profiles_update_self on profiles
  for update using (id = auth.uid());

create policy profiles_update_admin on profiles
  for update using (is_top_management(auth.uid()));

-- PROJECTS -----------------------------------------------------------------

create policy projects_select on projects
  for select using (
    is_top_management(auth.uid())
    or owner_id in (select visible_user_ids(auth.uid()))
    or id in (select project_id from project_members where user_id = auth.uid())
  );

create policy projects_insert on projects
  for insert with check (
    owner_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role in ('malik', 'boss', 'manager'))
  );

create policy projects_update on projects
  for update using (
    is_top_management(auth.uid()) or owner_id = auth.uid()
  );

create policy projects_delete on projects
  for delete using (
    is_top_management(auth.uid()) or owner_id = auth.uid()
  );

-- PROJECT MEMBERS ------------------------------------------------------------

create policy project_members_select on project_members
  for select using (
    user_id in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
  );

create policy project_members_insert on project_members
  for insert with check (
    user_id in (select visible_user_ids(auth.uid()))
    and exists (
      select 1 from projects
      where id = project_id
        and (owner_id in (select visible_user_ids(auth.uid())) or is_top_management(auth.uid()))
    )
  );

create policy project_members_delete on project_members
  for delete using (
    exists (
      select 1 from projects
      where id = project_id
        and (owner_id in (select visible_user_ids(auth.uid())) or is_top_management(auth.uid()))
    )
  );

-- TASKS ----------------------------------------------------------------------

create policy tasks_select on tasks
  for select using (
    assignee_id in (select visible_user_ids(auth.uid()))
    or created_by in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
  );

create policy tasks_insert on tasks
  for insert with check (
    created_by = auth.uid()
    and (assignee_id is null or assignee_id in (select visible_user_ids(auth.uid())))
  );

create policy tasks_update on tasks
  for update using (
    assignee_id = auth.uid()
    or created_by in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
  )
  with check (
    assignee_id is null
    or assignee_id = auth.uid()
    or assignee_id in (select visible_user_ids(auth.uid()))
  );

create policy tasks_delete on tasks
  for delete using (
    created_by in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
  );
