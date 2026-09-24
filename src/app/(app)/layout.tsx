import Link from "next/link";
import { LogOut, Waypoints } from "lucide-react";
import { getCurrentProfile } from "@/lib/current-user";
import { RoleBadge } from "@/components/role-badge";
import { Avatar } from "@/components/avatar";
import { MainNav, MobileNav } from "@/components/main-nav";
import { OnboardingTour } from "@/components/onboarding-tour";
import { PushNotifications } from "@/components/push-notifications";
import { signOut } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  // Reaching here means the middleware already saw a valid session. If there's
  // still no profile row (e.g. an auth user created outside the normal invite
  // flow), redirecting to /login would just bounce back here via middleware and
  // loop forever. Render a terminal "not provisioned" screen with a way out
  // instead — signing out clears the session so /login sticks.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-50 px-4">
        <div className="w-full max-w-sm text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
            <Waypoints className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <h1 className="mb-1 text-lg font-semibold text-slate-900">Account not set up yet</h1>
          <p className="mb-6 text-sm text-slate-500">
            You&apos;re signed in, but your account hasn&apos;t been added to a team yet. Ask a manager
            to invite you, then sign in again.
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-700"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Waypoints className="h-4 w-4" strokeWidth={2.5} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-slate-900">WorkTrack</span>
            </Link>
            <MainNav />
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/people/${profile.id}`}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-slate-100"
            >
              <Avatar name={profile.name} size="sm" />
              <span className="hidden text-sm text-slate-700 sm:inline">{profile.name}</span>
              <RoleBadge role={profile.role} />
            </Link>
            <form action={signOut}>
              <button
                className="flex items-center gap-1 rounded-md px-2 py-1.5 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                type="submit"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pt-6 pb-24 sm:pb-6">{children}</main>
      <MobileNav />
      {!profile.onboarded && <OnboardingTour />}
      {profile.onboarded && <PushNotifications />}
    </div>
  );
}
