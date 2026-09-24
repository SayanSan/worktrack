"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { sendTaskAssignedEmail } from "@/lib/email";
import { sendTaskAssignedPush } from "@/lib/push";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";

async function getAppUrl() {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function notifyAssignee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: { assigneeId: string; assignedById: string; projectId: string; taskTitle: string; dueDate: string | null }
) {
  if (input.assigneeId === input.assignedById) return; // don't email yourself

  const [{ data: assignee }, { data: assignedBy }, { data: project }, appUrl] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", input.assigneeId).single(),
    supabase.from("profiles").select("name").eq("id", input.assignedById).single(),
    supabase.from("projects").select("name").eq("id", input.projectId).single(),
    getAppUrl(),
  ]);

  const projectName = project?.name ?? "a project";
  const assignedByName = assignedBy?.name ?? "Someone";

  await Promise.all([
    assignee?.email
      ? sendTaskAssignedEmail({
          to: assignee.email,
          assigneeName: assignee.name,
          taskTitle: input.taskTitle,
          projectName,
          assignedByName,
          dueDate: input.dueDate,
          appUrl,
        })
      : Promise.resolve(),
    sendTaskAssignedPush(supabase, {
      userId: input.assigneeId,
      title: `New task: ${input.taskTitle}`,
      body: `${assignedByName} assigned you a task in ${projectName}${
        input.dueDate ? ` — due ${input.dueDate}` : ""
      }`,
      url: `${appUrl}/tasks`,
    }),
  ]);
}

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

  if (input.assigneeId) {
    await notifyAssignee(supabase, {
      assigneeId: input.assigneeId,
      assignedById: user.id,
      projectId: input.projectId,
      taskTitle: input.title,
      dueDate: input.dueDate || null,
    });
  }

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("tasks")
    .select("assignee_id, project_id, title, due_date")
    .eq("id", taskId)
    .single();

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

  const newAssigneeId = input.assigneeId !== undefined ? input.assigneeId : existing?.assignee_id;
  if (newAssigneeId && existing && newAssigneeId !== existing.assignee_id) {
    await notifyAssignee(supabase, {
      assigneeId: newAssigneeId,
      assignedById: user.id,
      projectId: existing.project_id,
      taskTitle: input.title ?? existing.title,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.due_date,
    });
  }

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
