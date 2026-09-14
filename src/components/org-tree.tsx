import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import type { Profile } from "@/lib/database.types";

function buildTree(profiles: Profile[]) {
  const byManager = new Map<string | null, Profile[]>();
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
  profile: Profile;
  byManager: Map<string | null, Profile[]>;
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

export function OrgTree({ profiles }: { profiles: Profile[] }) {
  const byManager = buildTree(profiles);
  const visibleIds = new Set(profiles.map((p) => p.id));
  // Roots: no manager, or manager not visible to this viewer.
  const roots = profiles
    .filter((p) => !p.manager_id || !visibleIds.has(p.manager_id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (roots.length === 0) return <p className="text-sm text-slate-400">No one to show yet.</p>;

  return (
    <div className="space-y-1">
      {roots.map((root) => (
        <TreeNode key={root.id} profile={root} byManager={byManager} depth={0} />
      ))}
    </div>
  );
}
