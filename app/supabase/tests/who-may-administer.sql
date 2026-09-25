-- What the People screen is allowed to do, asked of the database directly.
--
--   npx supabase db query --local  --workdir app -f "<abs path>/app/supabase/tests/who-may-administer.sql"
--   npx supabase db query --linked --workdir app -f "<abs path>/app/supabase/tests/who-may-administer.sql"
--
-- `-f` resolves relative to `--workdir`, so pass the absolute path.
--
-- It runs inside one transaction and rolls back, so it leaves nothing behind --
-- including on the linked project, where it is safe to run against real data.
-- Silence is a pass; the first failed assertion aborts with its own sentence.
--
-- **`set local role authenticated` is the whole point.** These functions are
-- `security definer` and the grants on them are half of what makes them safe,
-- so running the file as `postgres` would prove nothing: a superuser bypasses
-- both RLS and every grant, and every assertion below would pass on a database
-- with no protection at all.
--
-- The claims are set by hand because `auth.jwt()` reads them out of a GUC that
-- PostgREST normally writes. That is also what makes the aal cases testable at
-- all -- there is no other way to hold a session at aal1 on purpose.

begin;

-- ========== fixtures ==========
-- Written as the owner, before the role changes, because `authenticated` is
-- precisely the role that must not be able to write this table.
insert into public.staff_emails (email, is_admin)
values ('t-admin@test.invalid', true),
       ('t-reader@test.invalid', false)
on conflict (email) do update set is_admin = excluded.is_admin;

set local role authenticated;

-- ========== an administrator who has not typed their code ==========
select set_config('request.jwt.claims', '{"email":"t-admin@test.invalid","aal":"aal1"}', true);

do $$
begin
  assert public.is_admin() = false,
    'aal1 must not be an administrator: the mailbox is the first factor, and it is what an attacker has.';
  assert (select count(*) from public.roster()) = 0,
    'roster() must answer nothing at aal1.';
end $$;

do $$
begin
  perform public.set_second_factor('off');
  raise exception 'FAIL: set_second_factor succeeded at aal1 -- a compromised session could turn off its own second factor.';
exception
  when insufficient_privilege then null;
end $$;

-- ========== on the list, but not an administrator ==========
select set_config('request.jwt.claims', '{"email":"t-reader@test.invalid","aal":"aal2"}', true);

do $$
begin
  assert public.is_admin() = false,
    'A reviewer who is not flagged is_admin must not be an administrator, however strong their session.';
  assert (select count(*) from public.roster()) = 0,
    'roster() carries sign-in history, so it must answer nothing to a non-administrator.';
end $$;

-- ========== a stranger holding a valid token ==========
select set_config('request.jwt.claims', '{"email":"nobody@test.invalid","aal":"aal2"}', true);

do $$
begin
  assert public.is_admin() = false, 'An address that is not on the list is not an administrator.';
  assert public.on_staff_list() = false, 'An address that is not on the list is not staff.';
end $$;

-- ========== the allowlist stays unwritable from a browser ==========
-- The property the whole People screen was built around: every write goes
-- through the server-side endpoint, and no session reaching PostgREST directly
-- can add itself or anybody else. Tested at aal2 as a real administrator,
-- which is the strongest a browser can ever be.
select set_config('request.jwt.claims', '{"email":"t-admin@test.invalid","aal":"aal2"}', true);

do $$
begin
  insert into public.staff_emails (email) values ('attacker@test.invalid');
  raise exception 'FAIL: an authenticated administrator inserted into staff_emails directly. The endpoint is no longer the only way in.';
exception
  when insufficient_privilege then null;
end $$;

do $$
begin
  delete from public.staff_emails where email = 't-reader@test.invalid';
  raise exception 'FAIL: an authenticated administrator deleted from staff_emails directly.';
exception
  when insufficient_privilege then null;
end $$;

-- ========== and what an administrator at aal2 may do ==========
do $$
declare
  seen integer;
begin
  assert public.is_admin() = true,
    'An administrator at aal2 must be recognised, or the People screen is unreachable for everybody.';

  select count(*) into seen from public.roster();
  assert seen >= 2, format('roster() should list at least the two fixtures, saw %s.', seen);

  assert (select r.has_account from public.roster() r where r.email = 't-admin@test.invalid') = false,
    'A row with no auth user must report has_account false -- that is the half that otherwise fails silently.';

  perform public.set_second_factor('enrolled');
end $$;

rollback;
