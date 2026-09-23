-- Let top management remove a team member (delete their profile row).
-- profiles had no delete policy, so deletes were blocked for everyone.
-- Note: deleting a profile cascades to projects they own and tasks they created
-- (per the FK on delete cascade in 0001); tasks assigned to them are unassigned.
create policy profiles_delete_admin on profiles
  for delete using (is_top_management(auth.uid()));
