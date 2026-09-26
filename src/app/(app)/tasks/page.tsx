import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { TaskList, type TaskWithAssignee } from "@/components/task-list";
import { canManageAll } from "@/lib/permissions";

export default async function MyTasksPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [{ data: tasks }, { data: visibleProfiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(id, name), project:projects(id, name)")
      .eq("assignee_id", profile.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id, name"),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">My Tasks</h1>
      <p className="mb-6 text-sm text-slate-500">Everything assigned to you.</p>
      <TaskList
        tasks={(tasks ?? []) as TaskWithAssignee[]}
        canEdit
        canDelete={canManageAll(profile.role)}
        assignees={visibleProfiles ?? []}
      />
    </div>
  );
}
