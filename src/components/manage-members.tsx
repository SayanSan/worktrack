"use client";

import { useMemo, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { Avatar } from "@/components/avatar";
import { RoleBadge } from "@/components/role-badge";
import { Card } from "@/components/ui/card";
import { updateMember, removeMember } from "@/lib/actions/members";
import { ROLE_LABELS, ROLE_ORDER } from "@/lib/permissions";
import type { Profile, UserRole } from "@/lib/database.types";

// All ids at or below `rootId` in the manager_id graph — the people who must
// NOT be offered as `rootId`'s manager (that would create a reporting cycle).
function subtreeIds(rootId: string, childrenByManager: Map<string, Profile[]>) {
  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length) {
    const current = stack.pop()!;
    for (const child of childrenByManager.get(current) ?? []) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        stack.push(child.id);
      }
    }
  }
  return ids;
}

export function ManageMembers({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const [editing, setEditing] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole>("intern");
  const [managerId, setManagerId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function remove(p: Profile) {
    if (!window.confirm(`Remove ${p.name} (${p.email})? They'll lose access, and any projects they own and tasks they created will be deleted.`)) {
      return;
    }
    setRemovingId(p.id);
    startTransition(async () => {
      try {
        await removeMember(p.id);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : "Could not remove");
      } finally {
        setRemovingId(null);
      }
    });
  }

  const byId = useMemo(() => new Map(profiles.map((p) => [p.id, p])), [profiles]);
  const childrenByManager = useMemo(() => {
    const map = new Map<string, Profile[]>();
    for (const p of profiles) {
      if (!p.manager_id) continue;
      if (!map.has(p.manager_id)) map.set(p.manager_id, []);
      map.get(p.manager_id)!.push(p);
    }
    return map;
  }, [profiles]);

  const sorted = useMemo(
    () =>
      [...profiles].sort(
        (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.name.localeCompare(b.name)
      ),
    [profiles]
  );

  function openEdit(p: Profile) {
    setEditing(p);
    setRole(p.role);
    setManagerId(p.manager_id ?? "");
    setError(null);
  }

  const managerCandidates = useMemo(() => {
    if (!editing) return [];
    const excluded = subtreeIds(editing.id, childrenByManager);
    return profiles
      .filter((p) => !excluded.has(p.id) && p.role !== "intern")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [editing, profiles, childrenByManager]);

  function save() {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateMember(editing.id, { role, managerId: managerId || null });
        setEditing(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      }
    });
  }

  return (
    <div className="mt-8">
      <h2 className="mb-1 text-sm font-semibold text-slate-700">Manage roles &amp; reporting</h2>
      <p className="mb-3 text-xs text-slate-400">
        Set each person&apos;s role and who they report to. Only visible to top management.
      </p>
      <Card className="divide-y divide-slate-100 p-0">
        {sorted.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5">
            <Avatar name={p.name} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-slate-800">{p.name}</div>
              <div className="truncate text-xs text-slate-400">{p.email}</div>
            </div>
            <RoleBadge role={p.role} />
            <span className="hidden w-40 truncate text-right text-xs text-slate-400 sm:block">
              {p.manager_id ? `→ ${byId.get(p.manager_id)?.name ?? "—"}` : "top level"}
            </span>
            <button
              onClick={() => openEdit(p)}
              className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-700"
              aria-label={`Edit ${p.email}`}
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
            {p.id !== currentUserId && (
              <button
                onClick={() => remove(p)}
                disabled={pending && removingId === p.id}
                className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label={`Remove ${p.email}`}
              >
                <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            )}
          </div>
        ))}
      </Card>

      <Dialog open={Boolean(editing)} onClose={() => setEditing(null)} title={editing ? `Edit ${editing.email}` : ""}>
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-role">Role</Label>
            <Select id="edit-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="edit-manager">Reports to</Label>
            <Select id="edit-manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">Top level (no manager)</option>
              {managerCandidates.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.email}) · {ROLE_LABELS[m.role]}
                </option>
              ))}
            </Select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
