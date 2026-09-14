"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { inviteTeamMember } from "@/lib/actions/members";
import { ROLE_LABELS, INVITABLE_ROLES, isTopManagement } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

export function InviteMemberDialog({
  currentUserId,
  currentRole,
  managerCandidates,
}: {
  currentUserId: string;
  currentRole: UserRole;
  managerCandidates: { id: string; name: string }[];
}) {
  const invitableRoles = INVITABLE_ROLES[currentRole];
  const topMgmt = isTopManagement(currentRole);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>(invitableRoles[0]);
  const [managerId, setManagerId] = useState(topMgmt ? managerCandidates[0]?.id ?? "" : currentUserId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  if (invitableRoles.length === 0) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await inviteTeamMember({ name, email, role, managerId: managerId || currentUserId });
        setSuccess(true);
        setName("");
        setEmail("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <>
      <Button onClick={() => { setOpen(true); setSuccess(false); }}>Add team member</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add team member">
        {success ? (
          <div>
            <p className="text-sm text-slate-600">
              Invite sent — they&apos;ll get an email to set their password.
            </p>
            <div className="mt-4 flex justify-end">
              <Button onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select id="role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                {invitableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </div>
            {topMgmt && (
              <div>
                <Label htmlFor="manager">Reports to</Label>
                <Select id="manager" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
                  {managerCandidates.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Sending…" : "Send invite"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
