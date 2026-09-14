import { createClient } from "@/lib/supabase/server";
import { DashboardGrid } from "@/components/dashboard-grid";
import { ROLE_ORDER } from "@/lib/permissions";
import type { TaskWithProject } from "@/components/person-card";
import type { Profile } from "@/lib/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: tasks }, { data: projects }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("tasks").select("*, project:projects(id, name)"),
    supabase.from("projects").select("id, name").order("name"),
  ]);

  const sortedProfiles = ((profiles ?? []) as Profile[]).sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name)
  );

  const tasksByPerson: Record<string, TaskWithProject[]> = {};
  for (const task of (tasks ?? []) as TaskWithProject[]) {
    if (!task.assignee_id) continue;
    (tasksByPerson[task.assignee_id] ??= []).push(task);
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">Dashboard</h1>
      <p className="mb-6 text-sm text-slate-500">Who&apos;s working on what, right now.</p>
      <DashboardGrid profiles={sortedProfiles} tasksByPerson={tasksByPerson} projects={projects ?? []} />
    </div>
  );
}
