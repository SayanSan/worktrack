import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

const ROLE_STYLES: Record<UserRole, string> = {
  malik: "bg-violet-100 text-violet-700",
  boss: "bg-indigo-100 text-indigo-700",
  manager: "bg-sky-100 text-sky-700",
  associate: "bg-teal-100 text-teal-700",
  intern: "bg-slate-100 text-slate-600",
};

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return <Badge className={cn(ROLE_STYLES[role], className)}>{ROLE_LABELS[role]}</Badge>;
}
