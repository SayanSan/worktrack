import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/auth/set-password";
  const invite = searchParams.get("invite");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // If this sign-in came from an invite link, apply the role + reporting
      // line. A bad/expired token must not block the sign-in itself.
      if (invite) {
        const { error: claimError } = await supabase.rpc("claim_invite_link", { p_token: invite });
        if (claimError) console.error("Failed to claim invite link:", claimError.message);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
