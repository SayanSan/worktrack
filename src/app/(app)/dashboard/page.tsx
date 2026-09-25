import { createClient } from "@/lib/supabase/server";
import { DashboardGrid } from "@/components/dashboard-grid";
import { ActivityTimeline, type ActivityItem } from "@/components/activity-timeline";
import { ROLE_ORDER } from "@/lib/permissions";
import type { TaskWithProject } from "@/components/person-card";
import type { Profile } from "@/lib/database.types";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: tasks }, { data: projects }, { data: activity }] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("tasks").select("*, project:projects(id, name)"),
    supabase.from("projects").select("id, name").order("name"),
    supabase
      .from("activity_log")
      .select("id, message, created_at, actor:profiles(name)")
      .order("created_at", { ascending: false })
      .limit(20),
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

      <h2 className="mt-8 mb-3 text-sm font-semibold text-slate-700">Timeline</h2>
      <ActivityTimeline activities={(activity ?? []) as ActivityItem[]} />
    </div>
  );
}
