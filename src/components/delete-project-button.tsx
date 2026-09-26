"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { deleteProject } from "@/lib/actions/projects";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function doDelete() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteProject(projectId);
      } catch (err) {
        if (err instanceof Error && err.message !== "NEXT_REDIRECT") {
          setError(err.message);
        }
      }
    });
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" strokeWidth={2} />
        Delete project
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Delete project">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Delete <strong>{projectName}</strong>? All of its tasks will be deleted too. This can&apos;t
            be undone.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="danger" onClick={doDelete} disabled={pending}>
              {pending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
