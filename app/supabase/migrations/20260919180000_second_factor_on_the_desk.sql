-- A second factor on the review desk, and the switch that says how hard it bites.
--
-- The desk has had a sign-in since 20260903090000: a mailed link, and an
-- allowlist consulted by `is_staff()`. One factor, and it is a mailbox — so
-- whoever holds the mailbox holds the desk, and with it every story somebody
-- sent us about something that happened to them. This adds the second.
--
-- **The whole of this migration is one idea: `is_staff()` learns a new
-- question.** Every policy in the project already asks it -- stories,
-- submissions, registrations, the allowlist, story_entries, constellation
-- points, news -- so teaching the function rather than the policies means the
-- second factor arrives everywhere at once and cannot be forgotten on the one
-- table somebody adds next month. No policy below is rewritten. That is the
-- point of it.
--
-- TOTP rather than SMS or a second email. A second email is not a second
-- factor at all -- the first one is a mailbox, and one break takes both -- and
-- Supabase has no email factor to raise `aal` with anyway, so a code typed into
-- the page would be a gate the database could not see. SMS needs Twilio, costs
-- money per message, and is the weakest of the three. TOTP needs nothing but an
-- app the reviewer already has.

-- ========== The switch ==========
-- One row, three settings, and it exists so that applying this file changes
-- nothing on the day it lands.
--
-- Turning a second factor on for everybody at the moment a migration runs locks
-- out every reviewer who has not enrolled yet -- during whatever they were in
-- the middle of, with no warning, and no way to tell it from the desk being
-- broken. So the default is `enrolled`, which is the setting that bites only
-- the people who have opted in. Flipping to `required` is one UPDATE, made when
-- somebody has actually told the reviewers it is coming.
--
--   off       nothing changes; the desk is one factor again.
--   enrolled  a verified factor must be used *if you have one*. No factor, no
--             challenge. Zero-disruption, and honest about what it is: nothing
--             compels anybody, so this is a migration path and not a policy.
--   required  every reviewer must hold a factor and be at aal2. Enrolling is
--             self-serve at aal1, so nobody is permanently shut out -- they see
--             the enrol screen instead of the queue until they are done.
create table if not exists public.review_policy (
  -- One row, enforced rather than hoped for: `only_row` may only ever be true,
  -- and it is the primary key. A second insert fails on the key rather than
  -- silently giving the database two answers to the same question, which is
  -- how a settings table usually goes wrong.
  only_row      boolean primary key default true check (only_row),
  second_factor text not null default 'enrolled'
                check (second_factor in ('off', 'enrolled', 'required')),
  changed_at    timestamptz not null default now()
);

insert into public.review_policy (only_row) values (true)
  on conflict (only_row) do nothing;

alter table public.review_policy enable row level security;

-- Readable by anyone signed in, on purpose, and it is worth saying why: the
-- desk has to know which screen to show before it knows whether you are staff,
-- and this row holds no secret -- it says how the door works, not who may open
-- it. Not writable by anybody. Changing it is a deliberate act with the
-- service-role key or Studio, not something a compromised session can do to
-- turn its own second factor off.
drop policy if exists "signed in read policy" on public.review_policy;
create policy "signed in read policy" on public.review_policy
  for select to authenticated using (true);

grant select on table public.review_policy to authenticated;
grant select, insert, update on table public.review_policy to service_role;

-- ========== Am I on the list? ==========
-- Split out of `is_staff()` so the desk can tell three states apart that used
-- to look identical: not staff, staff without a factor, and staff who has one
-- but has not used it this session. All three previously read as an empty
-- queue, which is the one thing `States.tsx` already says is hard to explain.
--
-- It returns a boolean about the caller and nothing else -- never the list. The
-- `staff_emails` select policy still wants the full `is_staff()`, so the roster
-- itself stays behind the second factor while "are you on it" does not.
create or replace function public.on_staff_list() returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke execute on function public.on_staff_list() from public, anon;
grant execute on function public.on_staff_list() to authenticated;

-- ========== Is my session strong enough? ==========
-- `aal` is GoTrue's own claim on the JWT and it is the reason this works at
-- all: the token says aal2 only after a factor was actually verified, so this
-- reads a fact the browser cannot assert about itself. A page-level check is
-- decorative next to it -- an aal1 token still speaks to PostgREST directly.
--
-- `search_path = ''` and every name written in full. On a `security definer`
-- function that is not tidiness: without it a caller can put a schema of their
-- own in front of `public` and decide for themselves what `review_policy` and
-- `mfa_factors` contain, which is to say decide their own answer.
--
-- A missing policy row falls back to `enrolled` rather than to NULL. NULL would
-- make this return NULL, every policy read it as false, and the entire desk
-- would go dark on a truncated settings table.
create or replace function public.second_factor_ok() returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select case coalesce((select p.second_factor from public.review_policy p limit 1), 'enrolled')
    when 'off' then true
    when 'required' then coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    else coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      or not exists (
        select 1
        from auth.mfa_factors f
        where f.user_id = auth.uid()
          and f.status = 'verified'
      )
  end;
$$;

revoke execute on function public.second_factor_ok() from public, anon;
grant execute on function public.second_factor_ok() to authenticated;

-- ========== The one line that changes everything ==========
-- Same name, same signature, same `stable security definer` shape, so every
-- policy written against it since 20260903090000 keeps working untouched and
-- every one of them gains the second factor in the same statement.
create or replace function public.is_staff() returns boolean
  language sql
  stable
  security definer
  set search_path = ''
as $$
  select public.on_staff_list() and public.second_factor_ok();
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
