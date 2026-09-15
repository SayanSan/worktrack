"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { createTask, updateTask } from "@/lib/actions/tasks";
import type { TaskPriority } from "@/lib/database.types";
import type { TaskWithAssignee } from "@/components/task-list";

export function TaskFormDialog({
  projectId,
  assignees,
  trigger,
  task,
  open: openProp,
  onOpenChange,
}: {
  projectId?: string;
  assignees: { id: string; name: string }[];
  trigger?: React.ReactNode;
  task?: TaskWithAssignee;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isEdit = Boolean(task);
  const [openState, setOpenState] = useState(false);
  const open = openProp ?? openState;
  const setOpen = onOpenChange ?? setOpenState;

  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [assigneeId, setAssigneeId] = useState(task?.assignee_id ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(task?.due_date ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("medium");
    setDueDate("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        if (isEdit && task) {
          await updateTask(task.id, {
            title,
            description: description || null,
            assigneeId: assigneeId || null,
            priority,
            dueDate: dueDate || null,
          });
        } else if (projectId) {
          await createTask({
            projectId,
            title,
            description,
            assigneeId: assigneeId || null,
            priority,
            dueDate: dueDate || null,
          });
          reset();
        }
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      {openProp === undefined && (
        <span onClick={() => setOpen(true)}>
          {trigger ?? (
            <Button>
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              New task
            </Button>
          )}
        </span>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "Edit task" : "New task"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="assignee">Assignee</Label>
              <Select id="assignee" value={assigneeId ?? ""} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="dueDate">Due date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate ?? ""}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : isEdit ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
