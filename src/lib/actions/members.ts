"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INVITABLE_ROLES } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

export async function inviteTeamMember(input: {
  name: string;
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

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(input.email, {
    data: { name: input.name, role: input.role, manager_id: input.managerId },
  });

  if (error) throw new Error(error.message);

  revalidatePath("/team");
  revalidatePath("/dashboard");
}
