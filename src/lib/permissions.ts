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

export function canCreateProjects(role: UserRole) {
  return role === "malik" || role === "boss" || role === "manager";
}

export function canInvite(role: UserRole) {
  return INVITABLE_ROLES[role].length > 0;
}

// Invite *links* (as opposed to the email-based invite) are only ever minted
// for associate/intern — matches the invite_links_insert RLS check. Higher
// roles go through the email invite instead, which is more auditable.
export const LINK_ROLES: UserRole[] = ["associate", "intern"];
