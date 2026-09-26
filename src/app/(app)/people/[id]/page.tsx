import { notFound } from "next/navigation";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { TaskList, type TaskWithAssignee } from "@/components/task-list";
import { TaskFormDialog } from "@/components/task-form-dialog";
import { Button } from "@/components/ui/button";
import { visibleDescendantIds, canManageAll } from "@/lib/permissions";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Basic identity (name/role/manager) comes from org_tree_profiles, which
  // bypasses the usual hierarchy-scoped visibility — same as the /team org
  // chart, so clicking through from there never 404s just because the
  // viewer's own visible_user_ids doesn't reach this person. Their task list
  // below stays fully RLS-scoped as normal.
  const [{ data: allProfiles }, { data: tasks }, { data: visibleProfiles }, viewer] = await Promise.all([
    supabase.rpc("org_tree_profiles"),
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(id, name), project:projects(id, name)")
      .eq("assignee_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, name"),
    getCurrentProfile(),
  ]);

  const p = allProfiles?.find((person) => person.id === id);
  if (!p) notFound();
  const managerProfile = p.manager_id ? allProfiles?.find((person) => person.id === p.manager_id) : null;
  // Individual (project-less) task assignment is RLS-gated to the assigner's
  // own reporting subtree — since the org tree now shows the whole company,
  // this has to match that rule exactly, or clicking "Assign task" on
  // someone outside your subtree throws a raw RLS error instead of just not
  // showing the button.
  const canAssign = Boolean(
    viewer && allProfiles && visibleDescendantIds(allProfiles, viewer.id, viewer.role).has(p.id)
  );

  return (
    <div>
      <Link href="/dashboard" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-700">
        ← Dashboard
      </Link>

      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={p.name} size="lg" />
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{p.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <RoleBadge role={p.role} />
              {managerProfile && (
                <span className="text-xs text-slate-400">
                  reports to{" "}
                  <Link href={`/people/${managerProfile.id}`} className="text-slate-600 hover:underline">
                    {managerProfile.name}
                  </Link>
                </span>
              )}
            </div>
          </div>
        </div>
        {canAssign && (
          <TaskFormDialog
            defaultAssigneeId={p.id}
            assignees={[{ id: p.id, name: p.name }]}
            trigger={
              <Button variant="secondary">
                <UserPlus className="h-4 w-4" strokeWidth={2} />
                Assign task
              </Button>
            }
          />
        )}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Tasks</h2>
      <TaskList
        tasks={(tasks ?? []) as TaskWithAssignee[]}
        canEdit
        canDelete={Boolean(viewer && canManageAll(viewer.role))}
        assignees={visibleProfiles ?? []}
      />
    </div>
  );
}
