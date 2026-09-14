import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { TaskStatusBadge } from "@/components/status-badge";
import { formatDueDate } from "@/lib/utils";
import type { Profile, Task } from "@/lib/database.types";

export interface TaskWithProject extends Task {
  project: { id: string; name: string } | null;
}

export function PersonCard({
  profile,
  tasks,
}: {
  profile: Profile;
  tasks: TaskWithProject[];
}) {
  const visible = tasks.slice(0, 4);
  const remaining = tasks.length - visible.length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar name={profile.name} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/people/${profile.id}`}
            className="block truncate text-sm font-semibold text-slate-900 hover:underline"
          >
            {profile.name}
          </Link>
          <RoleBadge role={profile.role} className="mt-0.5" />
        </div>
        <span className="shrink-0 text-xs font-medium text-slate-400">
          {tasks.length} task{tasks.length === 1 ? "" : "s"}
        </span>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        {visible.length === 0 ? (
          <p className="py-2 text-sm text-slate-400">No active tasks.</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((task) => (
              <li key={task.id} className="rounded-md bg-slate-50 px-2.5 py-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm text-slate-800">{task.title}</span>
                  <TaskStatusBadge status={task.status} className="shrink-0" />
                </div>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                  {task.project && <span className="truncate">{task.project.name}</span>}
                  {task.due_date && (
                    <>
                      <span>·</span>
                      <span>Due {formatDueDate(task.due_date)}</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {remaining > 0 && (
          <Link
            href={`/people/${profile.id}`}
            className="mt-2 block text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            +{remaining} more
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
