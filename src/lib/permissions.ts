import type { UserRole } from "@/lib/database.types";

export const ROLE_LABELS: Record<UserRole, string> = {
  malik: "Malik",
  boss: "Boss",
  manager: "Manager",
  associate: "Associate",
  intern: "Intern",
};

export const ROLE_ORDER: UserRole[] = ["malik", "boss", "manager", "associate", "intern"];

export const ROLES_THAT_CAN_HAVE_REPORTS: UserRole[] = ["malik", "boss", "manager", "associate"];

// Which roles a given role is allowed to invite directly beneath itself.
export const INVITABLE_ROLES: Record<UserRole, UserRole[]> = {
  malik: ["boss", "manager", "associate", "intern"],
  boss: ["manager", "associate", "intern"],
  manager: ["associate", "intern"],
  associate: ["intern"],
  intern: [],
};

export function isTopManagement(role: UserRole) {
  return role === "malik" || role === "boss";
}

// Mirrors the DB's visible_user_ids(): top management sees everyone; anyone
// else sees themselves + everyone below them in the manager_id chain. Used
// for UI-side gating only (e.g. hiding actions that RLS would reject) — RLS
// itself remains the real enforcement, so a stale/partial `profiles` list
// here just means an occasional over-cautious hide, never a security hole.
export function visibleDescendantIds(
  profiles: { id: string; manager_id: string | null }[],
  viewerId: string,
  viewerRole: UserRole
): Set<string> {
  if (isTopManagement(viewerRole)) return new Set(profiles.map((p) => p.id));

  const childrenByManager = new Map<string, string[]>();
  for (const p of profiles) {
    if (!p.manager_id) continue;
    (childrenByManager.get(p.manager_id) ?? childrenByManager.set(p.manager_id, []).get(p.manager_id)!).push(p.id);
  }

  const visible = new Set<string>([viewerId]);
  const queue = [viewerId];
  while (queue.length > 0) {
    const current = queue.pop()!;
    for (const childId of childrenByManager.get(current) ?? []) {
      if (visible.has(childId)) continue;
      visible.add(childId);
      queue.push(childId);
    }
  }
  return visible;
}

export function canCreateProjects(role: UserRole) {
  return role === "malik" || role === "boss" || role === "manager";
}

// Every role except Intern can delete any task or project, regardless of
// ownership or reporting hierarchy — matches the DB's can_manage_all().
const CAN_MANAGE_ALL_ROLES: UserRole[] = ["malik", "boss", "manager", "associate"];
export function canManageAll(role: UserRole) {
  return CAN_MANAGE_ALL_ROLES.includes(role);
}

export function canInvite(role: UserRole) {
  return INVITABLE_ROLES[role].length > 0;
}

// Invite *links* (as opposed to the email-based invite) are only ever minted
// for associate/intern — matches the invite_links_insert RLS check. Higher
// roles go through the email invite instead, which is more auditable.
export const LINK_ROLES: UserRole[] = ["associate", "intern"];
