import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TaskStatus, TaskPriority, ProjectStatus } from "@/lib/database.types";

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-600",
  in_progress: "bg-blue-100 text-blue-700",
  in_review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  in_review: "In review",
  done: "Done",
};

export function TaskStatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge className={cn(TASK_STATUS_STYLES[status], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  );
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-500",
  medium: "bg-orange-100 text-orange-700",
  high: "bg-red-100 text-red-700",
};

export function PriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  return (
    <Badge className={cn(PRIORITY_STYLES[priority], className)}>
      {priority[0].toUpperCase() + priority.slice(1)}
    </Badge>
  );
}

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  on_hold: "bg-amber-100 text-amber-700",
  completed: "bg-slate-100 text-slate-500",
};

const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  completed: "Completed",
};

export function ProjectStatusBadge({ status, className }: { status: ProjectStatus; className?: string }) {
  return (
    <Badge className={cn(PROJECT_STATUS_STYLES[status], className)}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}
