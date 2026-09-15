-- Support "Sign in with Google": a manager pre-authorizes someone by email
-- (role + reporting line) *before* that person ever logs in. When they later
-- sign in with Google for the first time, handle_new_user() matches their
-- email against this table instead of relying on invite-email metadata.

create table invites (
  email text primary key,
  role user_role not null,
  manager_id uuid references profiles(id) on delete set null,
  invited_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table invites enable row level security;

create policy invites_select on invites
  for select using (
    is_top_management(auth.uid()) or invited_by in (select visible_user_ids(auth.uid()))
  );

create policy invites_insert on invites
  for insert with check (invited_by = auth.uid());

create policy invites_delete on invites
  for delete using (is_top_management(auth.uid()) or invited_by = auth.uid());

-- Replace handle_new_user(): check for a pending invite by email first (covers
-- Google OAuth sign-ins, which carry no app-specific metadata), falling back to
-- the old raw_user_meta_data path (covers admin.inviteUserByEmail-created users).
create or replace function handle_new_user() returns trigger as $$
declare
  inv invites%rowtype;
begin
  select * into inv from invites where email = lower(new.email);

  insert into public.profiles (id, name, email, role, manager_id, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(inv.role, (new.raw_user_meta_data ->> 'role')::user_role, 'intern'),
    coalesce(inv.manager_id, nullif(new.raw_user_meta_data ->> 'manager_id', '')::uuid),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );

  if inv.email is not null then
    delete from invites where email = inv.email;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;
