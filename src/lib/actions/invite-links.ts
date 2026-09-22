"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { INVITABLE_ROLES } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

const LINK_TTL_DAYS = 30;

// A manager (or above) mints a reusable link that pre-assigns a role and a
// reporting line (to themselves). Returns just the token — the client builds
// the full URL from its own origin.
export async function createInviteLink(input: { role: UserRole }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: me, error: meError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (meError || !me) throw new Error("Could not load your profile");

  if (!INVITABLE_ROLES[me.role].includes(input.role)) {
    throw new Error(`Your role (${me.role}) cannot invite a ${input.role}`);
  }

  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("invite_links").insert({
    token,
    role: input.role,
    manager_id: user.id,
    created_by: user.id,
    expires_at: expiresAt,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/team");
  return { token };
}

// Used when an already-signed-in user opens an invite link (the fresh-signup
// path goes through /auth/callback instead).
export async function claimInviteLink(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.rpc("claim_invite_link", { p_token: token });
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}
