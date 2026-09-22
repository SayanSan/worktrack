"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Waypoints } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { claimInviteLink } from "@/lib/actions/invite-links";
import { ROLE_LABELS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { UserRole } from "@/lib/database.types";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28v-3.1H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.38l4-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.62l4 3.1C6.22 6.88 8.87 4.77 12 4.77Z" />
    </svg>
  );
}

interface Info {
  role: UserRole;
  inviter_name: string;
  valid: boolean;
}

export function InviteAccept({ token, info }: { token: string; info: Info | null }) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
  }, []);

  async function continueWithGoogle() {
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?invite=${encodeURIComponent(
      token
    )}&next=/dashboard`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setError(error.message);
  }

  function joinNow() {
    setError(null);
    startTransition(async () => {
      try {
        await claimInviteLink(token);
        router.replace("/dashboard");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not join. Please try again.");
      }
    });
  }

  const invalid = !info || !info.valid;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Waypoints className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <h1 className="text-lg font-semibold text-slate-900">
            {invalid ? "Invite link not valid" : "You've been invited to WorkTrack"}
          </h1>
          {!invalid && (
            <p className="mt-1 text-sm text-slate-500">
              Join <strong>{info!.inviter_name}</strong>&apos;s team as a{" "}
              <strong>{ROLE_LABELS[info!.role]}</strong>.
            </p>
          )}
        </div>

        <Card>
          <CardContent className="pt-6">
            {invalid ? (
              <p className="text-center text-sm text-slate-500">
                This invite link is expired, revoked, or incorrect. Ask your manager for a new one.
              </p>
            ) : signedIn ? (
              <Button className="w-full" onClick={joinNow} disabled={pending}>
                {pending ? "Joining…" : "Join now"}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" onClick={continueWithGoogle}>
                <GoogleIcon />
                Continue with Google
              </Button>
            )}
            {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
