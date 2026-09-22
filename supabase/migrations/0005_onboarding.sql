-- First-run onboarding tour.
--
-- Tracks whether each user has completed the mandatory feature tour shown right
-- after their first sign-in. Defaults to false, so every existing user sees it
-- once on their next visit and every new hire sees it immediately.
--
-- The user flips their own flag to true after finishing the tour. That write is
-- already permitted by the profiles_update_self RLS policy (id = auth.uid()),
-- and the protect_role_and_manager trigger only blocks role/manager_id changes,
-- so a plain onboarded update goes through for any role.

alter table profiles add column if not exists onboarded boolean not null default false;
