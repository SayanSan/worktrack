import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { ProjectStatusBadge } from "@/components/status-badge";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { AddMemberDialog } from "@/components/add-member-dialog";
import { TaskList, type TaskWithAssignee } from "@/components/task-list";
import type { Profile, Project } from "@/lib/database.types";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const [{ data: project }, { data: memberRows }, { data: tasks }, { data: visibleProfiles }] =
    await Promise.all([
      supabase.from("projects").select("*").eq("id", id).maybeSingle(),
      supabase.from("project_members").select("user_id, profiles(id, name, role)").eq("project_id", id),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(id, name)")
        .eq("project_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name, role"),
    ]);

  if (!project) notFound();

  const members = (memberRows ?? [])
    .map((r) => r.profiles as unknown as Profile | null)
    .filter((p): p is Profile => Boolean(p));

  const memberIds = new Set(members.map((m) => m.id));
  const candidates = (visibleProfiles ?? []).filter((p) => !memberIds.has(p.id));

  const canManage = Boolean(
    profile && (profile.role === "malik" || profile.role === "boss" || profile.id === (project as Project).owner_id)
  );

  // Beyond the owner/top management, any current non-intern member can bring
  // in their own team — that's what makes cross-team collaboration on a
  // shared project possible. Backed by the relaxed project_members_insert
  // policy (0010_project_collaboration.sql).
  const canAddMembers = Boolean(
    canManage || (profile && profile.role !== "intern" && memberIds.has(profile.id))
  );

  return (
    <div>
      <Link href="/projects" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-700">
        ← Projects
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{(project as Project).name}</h1>
            <ProjectStatusBadge status={(project as Project).status} />
          </div>
          {(project as Project).description && (
            <p className="max-w-xl text-sm text-slate-500">{(project as Project).description}</p>
          )}
        </div>
        <TaskFormDialog
          projectId={id}
          assignees={members.map((m) => ({ id: m.id, name: m.name }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Tasks</h2>
          <TaskList
            tasks={(tasks ?? []) as TaskWithAssignee[]}
            canDelete={canManage}
            canEdit={canManage}
            assignees={members.map((m) => ({ id: m.id, name: m.name }))}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Members</h2>
            {canAddMembers && <AddMemberDialog projectId={id} candidates={candidates} />}
          </div>
          <ul className="space-y-2">
            {members.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/people/${m.id}`}
                  className="flex items-center gap-2 rounded-md p-1.5 hover:bg-slate-100"
                >
                  <Avatar name={m.name} size="sm" />
                  <span className="flex-1 truncate text-sm text-slate-700">{m.name}</span>
                  <RoleBadge role={m.role} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
