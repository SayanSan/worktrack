-- Assignment should follow project membership, not the reporting hierarchy.
--
-- tasks_insert previously required the assignee to be in the creator's
-- visible_user_ids (self + descendants). With flat/unset reporting lines that
-- meant a manager could only assign tasks to themselves — assigning to any
-- other project member was blocked by RLS, so the task was never created and
-- never appeared on anyone's dashboard. Allow assigning to any member of the
-- task's own project (is_project_member is SECURITY DEFINER, so no recursion).

drop policy if exists tasks_insert on tasks;
create policy tasks_insert on tasks
  for insert with check (
    created_by = auth.uid()
    and (
      assignee_id is null
      or assignee_id in (select visible_user_ids(auth.uid()))
      or is_project_member(project_id, assignee_id)
    )
  );

drop policy if exists tasks_update on tasks;
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
    or is_project_member(project_id, assignee_id)
  );
