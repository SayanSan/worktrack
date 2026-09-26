"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { logActivity } from "@/lib/activity";
import type { ProjectStatus } from "@/lib/database.types";

export async function createProject(input: { name: string; description?: string }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("projects")
    .insert({ name: input.name, description: input.description || null, owner_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Owner is implicitly a member.
  await supabase.from("project_members").insert({ project_id: data.id, user_id: user.id });

  revalidatePath("/projects");
  redirect(`/projects/${data.id}`);
}

export async function updateProjectStatus(projectId: string, status: ProjectStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ status }).eq("id", projectId);
  if (error) throw new Error(error.message);
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function addProjectMember(projectId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .insert({ project_id: projectId, user_id: userId });
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function removeProjectMember(projectId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", projectId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath(`/projects/${projectId}`);
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient();
  const actor = await getCurrentProfile();
  if (!actor) throw new Error("Not authenticated");

  const { data: existing } = await supabase.from("projects").select("name").eq("id", projectId).single();

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);

  if (existing) {
    await logActivity(supabase, actor.id, `${actor.name} deleted project "${existing.name}"`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  redirect("/projects");
}
