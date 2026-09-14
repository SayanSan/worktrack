# WorkTrack

A simplified, Jira-like work organizer. Everyone sees who's working on what, scoped to the reporting hierarchy: **Malik → Boss → Managers → Associates → Interns**.

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy `.env.local.example` to `.env.local` and fill in your Project URL, anon key, and service role key (Project Settings → API).
3. In the Supabase SQL editor, run the two files in `supabase/migrations/` in order (`0001_init.sql`, then `0002_rls.sql`).
4. In Supabase Auth settings, set the **Site URL** and add a redirect URL for `http://localhost:3000/auth/callback` (and your production URL later).
5. Install dependencies and start the app:

   ```bash
   npm install
   npm run dev
   ```

6. (Optional) Seed a sample org — 5 roles, 2 projects, a handful of tasks — so you can see how visibility differs per role:

   ```bash
   npm run seed
   ```

   All seeded accounts share the password printed by the script.

## How it works

- **Auth**: Supabase email/password. There's no public sign-up — a manager or above adds a new hire from the **Team** page, which sends them an email invite to set their password.
- **Visibility**: enforced by Postgres Row Level Security, not just the UI. Malik/Boss see the whole org; everyone else sees themselves plus everyone below them in the `manager_id` chain (`supabase/migrations/0002_rls.sql`).
- **Dashboard**: a grid of per-person cards showing each visible teammate's active tasks — the primary "who's working on what" view (no kanban board).
- **Projects**: project-cards → task lists grouped by status, with inline status updates.
