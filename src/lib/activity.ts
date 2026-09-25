import type { createClient } from "@/lib/supabase/server";

export async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  actorId: string,
  message: string
) {
  const { error } = await supabase.from("activity_log").insert({ actor_id: actorId, message });
  if (error) console.error("Failed to log activity:", error);
}
