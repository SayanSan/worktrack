import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { TaskList, type TaskWithAssignee } from "@/components/task-list";

export default async function MyTasksPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(id, name), project:projects(id, name)")
    .eq("assignee_id", profile.id)
    .order("due_date", { ascending: true, nullsFirst: false });

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">My Tasks</h1>
      <p className="mb-6 text-sm text-slate-500">Everything assigned to you.</p>
      <TaskList tasks={(tasks ?? []) as TaskWithAssignee[]} />
    </div>
  );
}
