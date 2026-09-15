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
