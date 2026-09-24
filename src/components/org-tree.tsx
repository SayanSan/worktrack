import Link from "next/link";
import { Network } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import type { Profile } from "@/lib/database.types";

export type OrgTreeProfile = Pick<Profile, "id" | "name" | "role" | "manager_id">;

function buildTree(profiles: OrgTreeProfile[]) {
  const byManager = new Map<string | null, OrgTreeProfile[]>();
  for (const p of profiles) {
    const key = p.manager_id;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(p);
  }
  for (const list of byManager.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return byManager;
}

function TreeNode({
  profile,
  byManager,
  depth,
}: {
  profile: OrgTreeProfile;
  byManager: Map<string | null, OrgTreeProfile[]>;
  depth: number;
}) {
  const children = byManager.get(profile.id) ?? [];
  return (
    <div>
      <Link
        href={`/people/${profile.id}`}
        className="flex items-center gap-2 rounded-md py-1.5 pr-2 hover:bg-slate-100"
        style={{ paddingLeft: depth * 24 }}
      >
        <Avatar name={profile.name} size="sm" />
        <span className="text-sm text-slate-800">{profile.name}</span>
        <RoleBadge role={profile.role} />
      </Link>
      {children.length > 0 && (
        <div className="border-l border-slate-100" style={{ marginLeft: depth * 24 + 12 }}>
          {children.map((child) => (
            <TreeNode key={child.id} profile={child} byManager={byManager} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function OrgTree({ profiles }: { profiles: OrgTreeProfile[] }) {
  const byManager = buildTree(profiles);
  const visibleIds = new Set(profiles.map((p) => p.id));
  // Roots: no manager, or manager not visible to this viewer.
  const roots = profiles
    .filter((p) => !p.manager_id || !visibleIds.has(p.manager_id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (roots.length === 0) {
    return (
      <EmptyState
        icon={Network}
        title="No one to show yet"
        description="Use “Add team member” to start building out the org chart."
      />
    );
  }

  return (
    <Card className="space-y-1 p-3">
      {roots.map((root) => (
        <TreeNode key={root.id} profile={root} byManager={byManager} depth={0} />
      ))}
    </Card>
  );
}
