import { FolderKanban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { ProjectCard } from "@/components/project-card";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { EmptyState } from "@/components/empty-state";
import { canCreateProjects } from "@/lib/permissions";
import type { Project, TaskStatus } from "@/lib/database.types";

const EMPTY_COUNTS: Record<TaskStatus, number> = {
  todo: 0,
  in_progress: 0,
  in_review: 0,
  done: 0,
};

export default async function ProjectsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: projects }, { data: members }, { data: tasks }] = await Promise.all([
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("project_members").select("project_id, profiles(id, name)"),
    supabase.from("tasks").select("project_id, status"),
  ]);

  const membersByProject: Record<string, { id: string; name: string }[]> = {};
  for (const row of members ?? []) {
    const person = row.profiles as unknown as { id: string; name: string } | null;
    if (!person) continue;
    (membersByProject[row.project_id] ??= []).push(person);
  }

  const countsByProject: Record<string, Record<TaskStatus, number>> = {};
  for (const t of tasks ?? []) {
    if (!t.project_id) continue; // individual tasks aren't scoped to a project
    const counts = (countsByProject[t.project_id] ??= { ...EMPTY_COUNTS });
    counts[t.status as TaskStatus]++;
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-lg font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500">Everything the team is currently working on.</p>
        </div>
        {profile && canCreateProjects(profile.role) && <NewProjectDialog />}
      </div>

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description={
            profile && canCreateProjects(profile.role)
              ? "Create your first project to start assigning work."
              : "Projects will show up here once a manager creates one."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(projects as Project[]).map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              members={membersByProject[project.id] ?? []}
              taskCounts={countsByProject[project.id] ?? EMPTY_COUNTS}
            />
          ))}
        </div>
      )}
    </div>
  );
}
