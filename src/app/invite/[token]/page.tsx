import { createClient } from "@/lib/supabase/server";
import { InviteAccept } from "./invite-accept";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_link_info", { p_token: token });
  const info = data?.[0] ?? null;

  return <InviteAccept token={token} info={info} />;
}
