-- A second tier on the allowlist: who may change who is on it.
--
-- `staff_emails` has had no write policy since 20260903090000, and that was
-- right: a session that is compromised cannot add an accomplice, so breaking
-- one mailbox buys the desk only until somebody notices. Putting an "add a
-- reviewer" button in the desk gives that property away -- every mailbox on the
-- list would become a way to mint a permanent second one.
--
-- So the button needs a tier the list did not have. `is_admin` is that tier,
-- and everything below exists to make it mean something.
--
-- **This migration grants nobody anything.** It adds a column defaulting to
-- false and two functions. Who is an administrator is decided in
-- `seed-staff.sql`, which is gitignored for the reason it states: who has admin
-- access is not a fact this repository should carry. A fresh database has an
-- allowlist with no administrators on it, exactly as it has an allowlist with
-- nobody on it, and both are bootstrapped out of band.
--
-- RLS is deliberately *not* relaxed. There is still no insert, update or delete
-- policy on `staff_emails`, so the browser still cannot write it with any
-- session at all. The desk's People screen goes through a server-side endpoint
-- holding the service-role key, which asks `is_admin()` about the caller before
-- it does anything -- see `api/roster.ts`. The table stays unwritable from the
-- client; what changes is that there is now a correct way to ask for a write.

alter table public.staff_emails add column if not exists is_admin boolean not null default false;
alter table public.staff_emails add column if not exists added_at timestamptz not null default now();
alter table public.staff_emails add column if not exists added_by text;

comment on column public.staff_emails.is_admin is
  'May add and remove reviewers, and change the second-factor policy. Requires aal2 in the session, not merely enrolment -- see public.is_admin().';
comment on column public.staff_emails.added_by is
  'The administrator who added this row, or null for a row seeded out of band.';

-- ========== Am I an administrator? ==========
-- **aal2 is hard here, and that is the point of the function.**
--
-- `is_staff()` asks `second_factor_ok()`, which honours `review_policy` -- so
-- under the default `enrolled` setting a reviewer with no factor is staff with
-- one factor, a mailbox. That is a reasonable bargain for reading a queue and a
-- bad one for changing who can read it: adding a reviewer is exactly the action
-- you do not want available to a session that has only proved a mailbox, since
-- the mailbox is what an attacker has.
--
-- The cost is honest and worth stating: until an administrator enrols a TOTP
-- factor, the People screen is unreachable for everybody, and enrolling needs
-- MFA turned on for the project (Authentication -> Providers). That is a
-- prerequisite for this feature, not a bug in it, and `People.tsx` says so on
-- screen rather than rendering an empty list.
create or replace function public.is_admin() returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
     and exists (
       select 1
       from public.staff_emails s
       where lower(s.email) = lower(auth.jwt() ->> 'email')
         and s.is_admin
     );
$$;

revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ========== The roster, as the People screen needs to read it ==========
-- Three of these columns are not in `staff_emails` and cannot be: whether the
-- address has an auth user, whether that user has verified a second factor, and
-- when they last signed in all live in the `auth` schema, which `authenticated`
-- cannot read. `security definer` is what makes them answerable at all.
--
-- They are worth the function because they are what an administrator has to see
-- before acting. "On the list but no account" is the silent half-failure this
-- whole feature exists to prevent -- an address that can never receive a link.
-- And nobody should flip `review_policy` to `required` without first seeing
-- that every row says yes under `has_factor`, or they lock the desk's own
-- people out of it.
--
-- Admin-only, checked inside rather than by the caller: a non-administrator
-- gets no rows instead of a sign-in history they have no business reading. The
-- plain `staff_emails` select policy is untouched, so ordinary staff can still
-- see who their colleagues are -- just not how their sessions are doing.
create or replace function public.roster()
returns table (
  email        text,
  is_admin     boolean,
  added_at     timestamptz,
  added_by     text,
  has_account  boolean,
  has_factor   boolean,
  last_sign_in timestamptz
)
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select
    s.email,
    s.is_admin,
    s.added_at,
    s.added_by,
    u.id is not null as has_account,
    exists (
      select 1
      from auth.mfa_factors f
      where f.user_id = u.id
        and f.status = 'verified'
    ) as has_factor,
    u.last_sign_in_at
  from public.staff_emails s
  left join auth.users u on lower(u.email) = lower(s.email)
  where public.is_admin()
  order by s.is_admin desc, s.email;
$$;

revoke execute on function public.roster() from public, anon;
grant execute on function public.roster() to authenticated;

-- ========== The door setting, now writable by an administrator ==========
-- `review_policy` has been readable by anyone signed in and writable by nobody
-- since 20260919180000, on the grounds that a compromised session must not be
-- able to turn its own second factor off. That still holds -- which is why this
-- is a function that demands `is_admin()` (and therefore aal2) rather than an
-- update policy on the table. A session at aal1 cannot reach it, so the setting
-- cannot be weakened by the very break it defends against.
--
-- The argument is `wanted`, not `next`. `RETURN NEXT` is plpgsql's statement for
-- a set-returning function, so `return next;` does not return a variable called
-- `next` -- it fails to create the function at all, with "cannot use RETURN NEXT
-- in a non-SETOF function". Found by running this file rather than by reading it.
create or replace function public.set_second_factor(wanted text) returns text
  language plpgsql
  security definer
  set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an administrator at aal2 may change this setting.'
      using errcode = '42501';
  end if;

  if wanted not in ('off', 'enrolled', 'required') then
    raise exception 'second_factor must be off, enrolled or required.'
      using errcode = '22023';
  end if;

  update public.review_policy set second_factor = wanted, changed_at = now();
  return wanted;
end;
$$;

revoke execute on function public.set_second_factor(text) from public, anon;
grant execute on function public.set_second_factor(text) to authenticated;
