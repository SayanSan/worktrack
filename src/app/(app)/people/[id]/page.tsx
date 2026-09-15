import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { TaskList, type TaskWithAssignee } from "@/components/task-list";
import type { Profile } from "@/lib/database.types";

export default async function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: profile }, { data: manager }, { data: tasks }, { data: visibleProfiles }] =
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
    ]);

  if (!profile) notFound();
  const p = profile as Profile;
  const managerProfile = (manager?.manager ?? null) as unknown as Profile | null;

  return (
    <div>
      <Link href="/dashboard" className="mb-4 inline-block text-xs text-slate-400 hover:text-slate-700">
        ← Dashboard
      </Link>

      <div className="mb-8 flex items-center gap-4">
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

      <h2 className="mb-3 text-sm font-semibold text-slate-700">Tasks</h2>
      <TaskList
        tasks={(tasks ?? []) as TaskWithAssignee[]}
        canEdit
        assignees={visibleProfiles ?? []}
      />
    </div>
  );
}
