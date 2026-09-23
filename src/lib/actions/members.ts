"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INVITABLE_ROLES } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

export async function inviteTeamMember(input: {
  email: string;
  role: UserRole;
  managerId: string; // reports to
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: viewer, error: viewerError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (viewerError || !viewer) throw new Error("Could not load your profile");

  if (!INVITABLE_ROLES[viewer.role].includes(input.role)) {
    throw new Error(`Your role (${viewer.role}) cannot invite a ${input.role}`);
  }

  // Non-top-management can only assign the new hire to report to themselves.
  if (viewer.role !== "malik" && viewer.role !== "boss" && input.managerId !== user.id) {
    throw new Error("You can only add direct reports under yourself");
  }

  const { error } = await supabase.from("invites").upsert({
    email: input.email.trim().toLowerCase(),
    role: input.role,
    manager_id: input.managerId,
    invited_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
}

// Top management edits an existing person's role and reporting line. Backed by
// the profiles_update_admin RLS policy; the protect_role_and_manager trigger
// permits the change because the caller is malik/boss.
export async function updateMember(
  userId: string,
  input: { role: UserRole; managerId: string | null }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: viewer, error: viewerError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (viewerError || !viewer) throw new Error("Could not load your profile");
  if (viewer.role !== "malik" && viewer.role !== "boss") {
    throw new Error("Only top management can change roles and reporting lines");
  }
  if (userId === input.managerId) {
    throw new Error("A person can't report to themselves");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: input.role, manager_id: input.managerId })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
}

// Top management removes a team member (deletes their profile). The person can
// no longer access the app until re-invited. Backed by profiles_delete_admin.
export async function removeMember(userId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  if (userId === user.id) throw new Error("You can't remove yourself");

  const { data: viewer, error: viewerError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (viewerError || !viewer) throw new Error("Could not load your profile");
  if (viewer.role !== "malik" && viewer.role !== "boss") {
    throw new Error("Only top management can remove members");
  }

  const { error } = await supabase.from("profiles").delete().eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
}
