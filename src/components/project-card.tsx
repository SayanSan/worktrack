import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/avatar";
import { ProjectStatusBadge } from "@/components/status-badge";
import type { Project, TaskStatus } from "@/lib/database.types";

export function ProjectCard({
  project,
  members,
  taskCounts,
}: {
  project: Project;
  members: { id: string; name: string }[];
  taskCounts: Record<TaskStatus, number>;
}) {
  const total = Object.values(taskCounts).reduce((a, b) => a + b, 0);

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{project.name}</h3>
            <ProjectStatusBadge status={project.status} className="shrink-0" />
          </div>
          {project.description && (
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{project.description}</p>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between">
            <div className="flex -space-x-2">
              {members.slice(0, 5).map((m) => (
                <Avatar key={m.id} name={m.name} size="sm" className="ring-2 ring-white" />
              ))}
              {members.length > 5 && (
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-medium text-slate-500 ring-2 ring-white">
                  +{members.length - 5}
                </span>
              )}
            </div>
            <span className="text-xs text-slate-400">
              {total} task{total === 1 ? "" : "s"} · {taskCounts.done} done
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
