-- Manager invite links + hardcoded admin access.

-- 1) Hardcode admin@tiu.com as top management (malik) whenever its auth user is
--    created, regardless of invites/metadata. This is the "admin can access
--    everything" guarantee; the password itself lives only in Supabase Auth.
create or replace function handle_new_user() returns trigger as $$
declare
  inv invites%rowtype;
  resolved_role user_role;
  resolved_manager uuid;
begin
  select * into inv from invites where email = lower(new.email);

  if lower(new.email) = 'admin@tiu.com' then
    resolved_role := 'malik';
    resolved_manager := null;
  else
    resolved_role := coalesce(inv.role, (new.raw_user_meta_data ->> 'role')::user_role, 'intern');
    resolved_manager := coalesce(inv.manager_id, nullif(new.raw_user_meta_data ->> 'manager_id', '')::uuid);
  end if;

  insert into public.profiles (id, name, email, role, manager_id, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    resolved_role,
    resolved_manager,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  );

  if inv.email is not null then
    delete from invites where email = inv.email;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 2) Let the SECURITY DEFINER claim flow (below) set role/manager despite the
--    "only top management can change role" guard, via a transaction-local flag.
create or replace function protect_role_and_manager() returns trigger as $$
begin
  if coalesce(current_setting('app.bypass_role_guard', true), '') = 'on' then
    return new;
  end if;
  if not exists (
    select 1 from profiles where id = auth.uid() and role in ('malik', 'boss')
  ) then
    if new.role is distinct from old.role or new.manager_id is distinct from old.manager_id then
      raise exception 'Only top management can change role or reporting line';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- 3) Reusable invite links a manager (or above) shares to add reports.
create table if not exists invite_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  role user_role not null,
  manager_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists invite_links_created_by_idx on invite_links(created_by);

alter table invite_links enable row level security;

create policy invite_links_select on invite_links
  for select using (created_by = auth.uid() or is_top_management(auth.uid()));

-- You may only mint links for people who will report to you, for a role you're
-- allowed to bring on (associates/interns). The exact per-role rule is enforced
-- in the server action; this is the coarse backstop.
create policy invite_links_insert on invite_links
  for insert with check (
    created_by = auth.uid()
    and manager_id = auth.uid()
    and role in ('associate', 'intern')
    and exists (
      select 1 from profiles
      where id = auth.uid() and role in ('malik', 'boss', 'manager', 'associate')
    )
  );

create policy invite_links_delete on invite_links
  for delete using (created_by = auth.uid() or is_top_management(auth.uid()));

-- 4) Public lookup: the accept page (viewer not signed in yet) reads a link's
--    role + inviter name by token. SECURITY DEFINER + granted to anon.
create or replace function invite_link_info(p_token text)
returns table (role user_role, inviter_name text, valid boolean) as $$
  select l.role,
         p.name as inviter_name,
         (l.revoked_at is null and (l.expires_at is null or l.expires_at > now())) as valid
  from invite_links l
  join profiles p on p.id = l.manager_id
  where l.token = p_token;
$$ language sql stable security definer set search_path = public;

-- 5) Claim a link: set the caller's role + reporting line. Only upgrades a
--    still-default intern, so an existing staff member who opens a link can't
--    be silently demoted.
create or replace function claim_invite_link(p_token text) returns void as $$
declare
  lnk invite_links%rowtype;
begin
  select * into lnk from invite_links where token = p_token;
  if not found then raise exception 'Invalid invite link'; end if;
  if lnk.revoked_at is not null then raise exception 'This invite link was revoked'; end if;
  if lnk.expires_at is not null and lnk.expires_at < now() then
    raise exception 'This invite link has expired';
  end if;

  perform set_config('app.bypass_role_guard', 'on', true);
  update profiles
     set role = lnk.role, manager_id = lnk.manager_id
   where id = auth.uid() and role = 'intern';
end;
$$ language plpgsql security definer set search_path = public;

grant execute on function invite_link_info(text) to anon, authenticated;
grant execute on function claim_invite_link(text) to authenticated;
