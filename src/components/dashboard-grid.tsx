"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { PersonCard, type TaskWithProject } from "@/components/person-card";
import { EmptyState } from "@/components/empty-state";
import { Select } from "@/components/ui/input";
import type { Profile, TaskStatus } from "@/lib/database.types";

const STATUS_OPTIONS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "in_review", label: "In review" },
  { value: "done", label: "Done" },
];

export function DashboardGrid({
  profiles,
  tasksByPerson,
  projects,
}: {
  profiles: Profile[];
  tasksByPerson: Record<string, TaskWithProject[]>;
  projects: { id: string; name: string }[];
}) {
  const [projectId, setProjectId] = useState("all");
  const [status, setStatus] = useState<TaskStatus | "all">("all");

  const filtered = useMemo(() => {
    const result: Record<string, TaskWithProject[]> = {};
    for (const profile of profiles) {
      let tasks = tasksByPerson[profile.id] ?? [];
      if (projectId !== "all") tasks = tasks.filter((t) => t.project_id === projectId);
      if (status !== "all") tasks = tasks.filter((t) => t.status === status);
      else tasks = tasks.filter((t) => t.status !== "done");
      result[profile.id] = tasks;
    }
    return result;
  }, [profiles, tasksByPerson, projectId, status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="w-auto"
        >
          <option value="all">All projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "all")}
          className="w-auto"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      {profiles.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No one to show yet"
          description="Add your team from the Team page to start seeing who's working on what."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <PersonCard key={profile.id} profile={profile} tasks={filtered[profile.id] ?? []} />
          ))}
        </div>
      )}
    </div>
  );
}
