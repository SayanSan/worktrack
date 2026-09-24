-- Follow-up to 0010: any current project member can already be *added* by a
-- fellow non-intern member (project_members_insert), but project_members_select
-- was never given the matching is_project_member branch — so a non-owner
-- member could only ever see their own row, not the rest of the roster they
-- just built. Same fix shape as tasks_select in 0010.
drop policy if exists project_members_select on project_members;
create policy project_members_select on project_members
  for select using (
    user_id in (select visible_user_ids(auth.uid()))
    or project_owner_visible(project_id, auth.uid())
    or is_top_management(auth.uid())
    or is_project_member(project_id, auth.uid())
  );
