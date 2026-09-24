"use client";

import { useState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { addProjectMember } from "@/lib/actions/projects";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

export function AddMemberDialog({
  projectId,
  candidates,
}: {
  projectId: string;
  candidates: { id: string; name: string; role: UserRole }[];
}) {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState(candidates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await addProjectMember(projectId, userId);
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  if (candidates.length === 0) return null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="h-3.5 w-3.5" strokeWidth={2.5} />
        Add member
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add member">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="member">Team member</Label>
            <Select id="member" value={userId} onChange={(e) => setUserId(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {ROLE_LABELS[c.role]}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-slate-400">
              Includes your own team and other managers — add a manager to bring their team in too.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Adding…" : "Add"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
