-- WorkTrack initial schema

create extension if not exists pgcrypto;

create type user_role as enum ('malik', 'boss', 'manager', 'associate', 'intern');
create type project_status as enum ('active', 'on_hold', 'completed');
create type task_status as enum ('todo', 'in_progress', 'in_review', 'done');
create type task_priority as enum ('low', 'medium', 'high');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role user_role not null default 'intern',
  manager_id uuid references profiles(id) on delete set null,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status project_status not null default 'active',
  owner_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  title text not null,
  description text,
  status task_status not null default 'todo',
  priority task_priority not null default 'medium',
  assignee_id uuid references profiles(id) on delete set null,
  created_by uuid not null references profiles(id) on delete cascade,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_manager_id_idx on profiles(manager_id);
create index projects_owner_id_idx on projects(owner_id);
create index tasks_project_id_idx on tasks(project_id);
create index tasks_assignee_id_idx on tasks(assignee_id);
create index project_members_user_id_idx on project_members(user_id);

-- Keep tasks.updated_at current
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_set_updated_at
  before update on tasks
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever an auth user is created (via admin invite/createUser).
-- Role, display name and manager_id are passed through user_metadata at creation time.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, manager_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'intern'),
    nullif(new.raw_user_meta_data ->> 'manager_id', '')::uuid
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Only top management may change someone's role or reporting line after creation.
create or replace function protect_role_and_manager() returns trigger as $$
begin
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

create trigger profiles_protect_role_manager
  before update on profiles
  for each row execute function protect_role_and_manager();
