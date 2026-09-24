-- Tasks no longer require a project — an "individual task" is assigned
-- directly to someone from their profile page, with project_id left null.
--
-- No RLS policy changes needed: every existing tasks_* policy already
-- degrades correctly when project_id is null (is_project_member(null, x) and
-- `project_id in (select ...)` both evaluate to false/not-satisfied for a
-- null project_id), leaving tasks_insert's assignee check to fall back to
-- `assignee_id in visible_user_ids(auth.uid())` — exactly the reporting-
-- hierarchy rule an unscoped, individual assignment should follow.
alter table tasks alter column project_id drop not null;
