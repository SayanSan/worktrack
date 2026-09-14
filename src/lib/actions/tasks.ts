"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";

export async function createTask(input: {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("tasks").insert({
    project_id: input.projectId,
    title: input.title,
    description: input.description || null,
    assignee_id: input.assigneeId || null,
    priority: input.priority,
    due_date: input.dueDate || null,
    created_by: user.id,
    status: "todo",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath(`/projects/${input.projectId}`);
  revalidatePath("/tasks");
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}

export async function updateTask(
  taskId: string,
  input: Partial<{
    title: string;
    description: string | null;
    assigneeId: string | null;
    priority: TaskPriority;
    status: TaskStatus;
    dueDate: string | null;
  }>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.assigneeId !== undefined ? { assignee_id: input.assigneeId } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.dueDate !== undefined ? { due_date: input.dueDate } : {}),
    })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}
