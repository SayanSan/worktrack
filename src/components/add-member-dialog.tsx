"use client";

import { useState, useTransition } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { addProjectMember } from "@/lib/actions/projects";

export function AddMemberDialog({
  projectId,
  candidates,
}: {
  projectId: string;
  candidates: { id: string; name: string }[];
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
        Add member
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add member">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="member">Team member</Label>
            <Select id="member" value={userId} onChange={(e) => setUserId(e.target.value)}>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
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
