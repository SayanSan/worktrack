-- Cross-team project collaboration.
--
-- Until now, a project's membership and every RLS check that follows from it
-- (who you can assign tasks to, who you can add) were bounded by
-- visible_user_ids — your own reporting subtree. Two managers could never
-- collaborate on a shared project: neither could add the other (a peer, not a
-- subordinate) as a member, and even if they somehow were added, neither
-- could see or assign to the other's team within that project.
--
-- This introduces two ideas:
--   1. A manager-or-above person can always be added to a project as a peer
--      collaborator, regardless of reporting lines (is_peer_manager).
--   2. Once *any* two people share a project, they become visible to each
--      other (shares_project_with) and any current, non-intern member of a
--      project can bring in their own team (not just the project owner).

-- 1) Peer collaborators: manager-and-above, addable to any project regardless
--    of whose subtree they're in.
create or replace function is_peer_manager(target uuid) returns boolean as $$
  select exists (
    select 1 from profiles where id = target and role in ('malik', 'boss', 'manager')
  );
$$ language sql stable security definer set search_path = public;

-- 2) Sharing a project makes two people mutually visible (name/role/email),
--    without exposing either one's full team or other projects.
create or replace function shares_project_with(viewer uuid, target uuid) returns boolean as $$
  select exists (
    select 1 from project_members pm1
    join project_members pm2 on pm1.project_id = pm2.project_id
    where pm1.user_id = viewer and pm2.user_id = target
  );
$$ language sql stable security definer set search_path = public;

-- profiles: add project-mates and the manager-level "directory" (so a manager
-- can find a peer to invite in the first place — before any project is shared).
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles
  for select using (
    id in (select visible_user_ids(auth.uid()))
    or shares_project_with(auth.uid(), id)
    or role in ('malik', 'boss', 'manager')
  );

-- project_members: any current non-intern member (not just the owner) can add
-- people from their own team; anyone with access can add a peer manager+.
drop policy if exists project_members_insert on project_members;
create policy project_members_insert on project_members
  for insert with check (
    (
      project_owner_visible(project_id, auth.uid())
      or is_top_management(auth.uid())
      or (
        is_project_member(project_id, auth.uid())
        and exists (select 1 from profiles where id = auth.uid() and role <> 'intern')
      )
    )
    and (
      user_id in (select visible_user_ids(auth.uid()))
      or is_peer_manager(user_id)
    )
  );

-- Symmetric with insert: you can also remove your own team from a project you
-- didn't create, not just the people the owner/top management added.
drop policy if exists project_members_delete on project_members;
create policy project_members_delete on project_members
  for delete using (
    project_owner_visible(project_id, auth.uid())
    or is_top_management(auth.uid())
    or user_id in (select visible_user_ids(auth.uid()))
  );

-- tasks: any project member sees the whole board (not just their own slice),
-- and can move a card's status even if they didn't create or own the task.
-- Who a task can be (re)assigned to is unchanged — still gated by
-- is_project_member in tasks_insert/tasks_update's WITH CHECK.
drop policy if exists tasks_select on tasks;
create policy tasks_select on tasks
  for select using (
    assignee_id in (select visible_user_ids(auth.uid()))
    or created_by in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
    or is_project_member(project_id, auth.uid())
  );

drop policy if exists tasks_update on tasks;
create policy tasks_update on tasks
  for update using (
    assignee_id = auth.uid()
    or created_by in (select visible_user_ids(auth.uid()))
    or project_id in (select id from projects where owner_id in (select visible_user_ids(auth.uid())))
    or is_project_member(project_id, auth.uid())
  )
  with check (
    assignee_id is null
    or assignee_id = auth.uid()
    or assignee_id in (select visible_user_ids(auth.uid()))
    or is_project_member(project_id, assignee_id)
  );
