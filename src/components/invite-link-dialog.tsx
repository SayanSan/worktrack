"use client";

import { useState, useTransition } from "react";
import { Link2, Copy, Check } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label, Select } from "@/components/ui/input";
import { createInviteLink } from "@/lib/actions/invite-links";
import { ROLE_LABELS, INVITABLE_ROLES, LINK_ROLES } from "@/lib/permissions";
import type { UserRole } from "@/lib/database.types";

export function InviteLinkDialog({ currentRole }: { currentRole: UserRole }) {
  // Invite links only ever carry associate/intern (see LINK_ROLES) — narrower
  // than INVITABLE_ROLES, which also covers the email-based invite path.
  const invitableRoles = INVITABLE_ROLES[currentRole].filter((r) => LINK_ROLES.includes(r));

  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<UserRole>(invitableRoles[0]);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (invitableRoles.length === 0) return null;

  function generate() {
    setError(null);
    setUrl(null);
    setCopied(false);
    startTransition(async () => {
      try {
        const { token } = await createInviteLink({ role });
        setUrl(`${window.location.origin}/invite/${token}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not create link");
      }
    });
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the field is selectable as a fallback.
    }
  }

  function close() {
    setOpen(false);
    setUrl(null);
    setError(null);
  }

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Link2 className="h-4 w-4" strokeWidth={2.5} />
        Invite via link
      </Button>
      <Dialog open={open} onClose={close} title="Invite via link">
        <div className="space-y-4">
          <div>
            <Label htmlFor="link-role">Role</Label>
            <Select id="link-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
              {invitableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </Select>
            <p className="mt-1.5 text-xs text-slate-400">
              Anyone who opens the link signs in with Google and joins your team in this role. The
              link works for 30 days.
            </p>
          </div>

          {url ? (
            <div>
              <Label htmlFor="link-url">Share this link</Label>
              <div className="flex gap-2">
                <input
                  id="link-url"
                  readOnly
                  value={url}
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none"
                />
                <Button type="button" variant="secondary" onClick={copy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          ) : null}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={close}>
              {url ? "Done" : "Cancel"}
            </Button>
            <Button type="button" onClick={generate} disabled={pending}>
              {pending ? "Generating…" : url ? "New link" : "Generate link"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
