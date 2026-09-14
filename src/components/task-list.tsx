"use client";

import { useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { PriorityBadge } from "@/components/status-badge";
import { Select } from "@/components/ui/input";
import { formatDueDate } from "@/lib/utils";
import { updateTaskStatus, deleteTask } from "@/lib/actions/tasks";
import type { Task, TaskStatus } from "@/lib/database.types";

const STATUS_GROUPS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "To do" },
  { status: "in_progress", label: "In progress" },
  { status: "in_review", label: "In review" },
  { status: "done", label: "Done" },
];

export interface TaskWithAssignee extends Task {
  assignee: { id: string; name: string } | null;
}

export function TaskList({
  tasks,
  canDelete,
}: {
  tasks: TaskWithAssignee[];
  canDelete?: boolean;
}) {
  const [, startTransition] = useTransition();

  if (tasks.length === 0) {
    return <p className="text-sm text-slate-400">No tasks yet.</p>;
  }

  return (
    <div className="space-y-6">
      {STATUS_GROUPS.map((group) => {
        const groupTasks = tasks.filter((t) => t.status === group.status);
        if (groupTasks.length === 0) return null;
        return (
          <div key={group.status}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group.label} · {groupTasks.length}
            </h3>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white">
              {groupTasks.map((task) => (
                <li key={task.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{task.title}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                      <PriorityBadge priority={task.priority} />
                      {task.due_date && <span>Due {formatDueDate(task.due_date)}</span>}
                    </div>
                  </div>
                  {task.assignee && (
                    <Avatar name={task.assignee.name} size="sm" />
                  )}
                  <Select
                    value={task.status}
                    className="w-auto shrink-0"
                    onChange={(e) =>
                      startTransition(() => updateTaskStatus(task.id, e.target.value as TaskStatus))
                    }
                  >
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="in_review">In review</option>
                    <option value="done">Done</option>
                  </Select>
                  {canDelete && (
                    <button
                      onClick={() => startTransition(() => deleteTask(task.id))}
                      className="shrink-0 text-xs text-slate-300 hover:text-red-600"
                      aria-label="Delete task"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
