import Link from "next/link";
import { redirect } from "next/navigation";
import { LayoutGrid, FolderKanban, ListChecks, Users2, LogOut, Waypoints } from "lucide-react";
import { getCurrentProfile } from "@/lib/current-user";
import { RoleBadge } from "@/components/role-badge";
import { Avatar } from "@/components/avatar";
import { NavLink } from "@/components/nav-link";
import { signOut } from "@/lib/actions/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
    { href: "/projects", label: "Projects", icon: FolderKanban },
    { href: "/tasks", label: "My Tasks", icon: ListChecks },
    { href: "/team", label: "Team", icon: Users2 },
  ];

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
            <nav className="flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/people/${profile.id}`}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2.5 hover:bg-slate-100"
            >
              <Avatar name={profile.name} size="sm" />
              <span className="text-sm text-slate-700">{profile.name}</span>
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
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
