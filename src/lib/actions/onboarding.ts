"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Marks the current user as having finished the first-run tour. Called from the
// mandatory onboarding overlay; once set, the overlay never shows again.
export async function completeOnboarding() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("profiles").update({ onboarded: true }).eq("id", user.id);
  if (error) throw new Error(error.message);

  // The tour is gated in the (app) layout off the current profile, so refresh
  // every route under it.
  revalidatePath("/", "layout");
}
