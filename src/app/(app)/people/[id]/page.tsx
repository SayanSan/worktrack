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
import { ROLES_THAT_CAN_HAVE_REPORTS } from "@/lib/permissions";
import type { Profile } from "@/lib/database.types";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: manager }, { data: tasks }, { data: visibleProfiles }, viewer] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("profiles")
        .select("manager:profiles!profiles_manager_id_fkey(id, name, role)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(id, name), project:projects(id, name)")
        .eq("assignee_id", id)
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, name"),
      getCurrentProfile(),
    ]);

  if (!profile) notFound();
  const p = profile as Profile;
  const managerProfile = (manager?.manager ?? null) as unknown as Profile | null;
  // Coarse client-side gate matching the DB rule for individual-task
  // assignment (assignee must be in the assigner's reporting subtree, or the
  // assigner is top management) — RLS is the real enforcement either way.
  const canAssign = Boolean(viewer && ROLES_THAT_CAN_HAVE_REPORTS.includes(viewer.role));

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
        assignees={visibleProfiles ?? []}
      />
    </div>
  );
}
