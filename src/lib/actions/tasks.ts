"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { sendTaskAssignedEmail } from "@/lib/email";
import { sendTaskAssignedPush } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import { TASK_STATUS_LABELS } from "@/components/status-badge";
import type { TaskPriority, TaskStatus } from "@/lib/database.types";

async function getAppUrl() {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol = host?.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function notifyAssignee(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    assigneeId: string;
    assignedById: string;
    projectId: string | null;
    taskTitle: string;
    dueDate: string | null;
  }
) {
  if (input.assigneeId === input.assignedById) return; // don't email yourself

  const [{ data: assignee }, { data: assignedBy }, { data: project }, { data: chain }, appUrl] = await Promise.all([
    supabase.from("profiles").select("name, email").eq("id", input.assigneeId).single(),
    supabase.from("profiles").select("name").eq("id", input.assignedById).single(),
    input.projectId
      ? supabase.from("projects").select("name").eq("id", input.projectId).single()
      : Promise.resolve({ data: null }),
    supabase.rpc("manager_chain", { target: input.assigneeId }),
    getAppUrl(),
  ]);

  const projectName = project?.name ?? null;
  const assignedByName = assignedBy?.name ?? "Someone";
  // CC the assignee's manager(s) and boss so leadership stays in the loop —
  // but not the person who just made the assignment themselves.
  const cc = (chain ?? [])
    .filter((person) => person.id !== input.assignedById && person.email)
    .map((person) => person.email as string);

  await Promise.all([
    assignee?.email
      ? sendTaskAssignedEmail({
          to: assignee.email,
          cc,
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
      body: `${assignedByName} assigned you a task${projectName ? ` in ${projectName}` : ""}${
        input.dueDate ? ` — due ${input.dueDate}` : ""
      }`,
      url: `${appUrl}/tasks`,
    }),
    logActivity(
      supabase,
      input.assignedById,
      `${assignedByName} assigned "${input.taskTitle}" to ${assignee?.name ?? "someone"}${
        projectName ? ` in ${projectName}` : ""
      }`
    ),
  ]);
}

export async function createTask(input: {
  projectId?: string | null;
  title: string;
  description?: string;
  assigneeId?: string | null;
  priority: TaskPriority;
  dueDate?: string | null;
}) {
  const supabase = await createClient();
  const actor = await getCurrentProfile();
  if (!actor) throw new Error("Not authenticated");

  const projectId = input.projectId || null;

  const { error } = await supabase.from("tasks").insert({
    project_id: projectId,
    title: input.title,
    description: input.description || null,
    assignee_id: input.assigneeId || null,
    priority: input.priority,
    due_date: input.dueDate || null,
    created_by: actor.id,
    status: "todo",
  });

  if (error) throw new Error(error.message);

  let projectName: string | null = null;
  if (projectId) {
    const { data: project } = await supabase.from("projects").select("name").eq("id", projectId).single();
    projectName = project?.name ?? null;
  }
  await logActivity(
    supabase,
    actor.id,
    `${actor.name} created "${input.title}"${projectName ? ` in ${projectName}` : ""}`
  );

  if (input.assigneeId) {
    await notifyAssignee(supabase, {
      assigneeId: input.assigneeId,
      assignedById: actor.id,
      projectId,
      taskTitle: input.title,
      dueDate: input.dueDate || null,
    });
    revalidatePath(`/people/${input.assigneeId}`);
  }

  revalidatePath("/dashboard");
  if (projectId) revalidatePath(`/projects/${projectId}`);
  revalidatePath("/tasks");
}

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = await createClient();
  const actor = await getCurrentProfile();
  if (!actor) throw new Error("Not authenticated");

  const { data: existing } = await supabase.from("tasks").select("title").eq("id", taskId).single();

  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId);
  if (error) throw new Error(error.message);

  if (existing) {
    const message =
      status === "done"
        ? `${actor.name} completed "${existing.title}"`
        : `${actor.name} moved "${existing.title}" to ${TASK_STATUS_LABELS[status]}`;
    await logActivity(supabase, actor.id, message);
  }

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
  const actor = await getCurrentProfile();
  if (!actor) throw new Error("Not authenticated");

  const { data: existing } = await supabase
    .from("tasks")
    .select("assignee_id, project_id, title, due_date, status")
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

  const title = input.title ?? existing?.title ?? "a task";

  const newAssigneeId = input.assigneeId !== undefined ? input.assigneeId : existing?.assignee_id;
  if (newAssigneeId && existing && newAssigneeId !== existing.assignee_id) {
    await notifyAssignee(supabase, {
      assigneeId: newAssigneeId,
      assignedById: actor.id,
      projectId: existing.project_id,
      taskTitle: title,
      dueDate: input.dueDate !== undefined ? input.dueDate : existing.due_date,
    });
    revalidatePath(`/people/${newAssigneeId}`);
  }

  if (input.status !== undefined && existing && input.status !== existing.status) {
    const message =
      input.status === "done"
        ? `${actor.name} completed "${title}"`
        : `${actor.name} moved "${title}" to ${TASK_STATUS_LABELS[input.status]}`;
    await logActivity(supabase, actor.id, message);
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}

export async function deleteTask(taskId: string) {
  const supabase = await createClient();
  const actor = await getCurrentProfile();
  if (!actor) throw new Error("Not authenticated");

  const { data: existing } = await supabase.from("tasks").select("title").eq("id", taskId).single();

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) throw new Error(error.message);

  if (existing) {
    await logActivity(supabase, actor.id, `${actor.name} deleted "${existing.title}"`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/projects", "layout");
}
