import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/current-user";
import { OrgTree } from "@/components/org-tree";
import { InviteMemberDialog } from "@/components/invite-member-dialog";
import { InviteLinkDialog } from "@/components/invite-link-dialog";
import { ManageMembers } from "@/components/manage-members";
import { ROLE_ORDER, isTopManagement } from "@/lib/permissions";
import type { Profile } from "@/lib/database.types";

export default async function TeamPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();
  const { data: profiles } = await supabase.from("profiles").select("*");

  if (!profile) return null;

  const managerCandidates = ((profiles ?? []) as Profile[])
    .filter((p) => p.role !== "intern")
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="mb-1 text-lg font-semibold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">Who reports to whom.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InviteLinkDialog currentRole={profile.role} />
          <InviteMemberDialog
            currentUserId={profile.id}
            currentRole={profile.role}
            managerCandidates={managerCandidates}
          />
        </div>
      </div>
      <OrgTree profiles={(profiles ?? []) as Profile[]} />
      {isTopManagement(profile.role) && <ManageMembers profiles={(profiles ?? []) as Profile[]} />}
    </div>
  );
}
