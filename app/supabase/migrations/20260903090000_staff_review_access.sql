-- Staff access to the intake tables, and the two tables the pre-port sign-up
-- flow left behind.
--
-- Copied verbatim from schema.sql sections 2b, 2c and 2d, which stay the source
-- of truth. Every statement is idempotent (create table if not exists, drop
-- policy if exists before each create policy, create or replace for the
-- function), so this is safe on a database that already has some of it.
-- workshop_registrations and staff_emails already exist on the linked project;
-- their create table here is a no-op that makes a fresh database match.
--
-- It grants nothing by itself. is_staff() reads staff_emails, and that table is
-- empty until seed-staff.sql is applied -- which is gitignored, because who has
-- admin access is per-deployment. Applying this without it leaves every policy
-- evaluating to false, which is the correct closed default.

-- ========== 2b. Workshop registrations ==========
-- The intake table for a workshop sign-up form, from the round before the
-- React port — the same round that created `workshops` with an `id` column to
-- fill that form's dropdown, which is why the live `workshops` still carries
-- both `id` and `slug`.
--
-- On the live database `workshop_id` has a foreign key to `workshops.id`. It is
-- not declared here, because §5b creates `workshops` with `slug` as its only
-- key — the `id` column exists solely on the database that predates the port,
-- which `create table if not exists` left in place. Declaring the FK would make
-- this file fail on the fresh database it is supposed to build. Reconcile the
-- two shapes before relying on the reference; until then the form has
-- `workshop_slug`, which `workshops.slug` does key.
--
-- It is in the linked database and was in neither this file nor a migration,
-- so a database built from `npm run supabase-setup` did not have it. Declared
-- here so that stops being true. **The column list is reconstructed from the
-- generated types** (`app/src/lib/database.types.ts`), not from the original
-- DDL, so defaults and constraints are a best guess — check it against the
-- live table before trusting this on a database that matters.
--
-- No form posts to it yet: `site/` has only `data-in-form="submissions"` and
-- `="stories"`, and SupabaseForm's `WritableTable` names those two. The table
-- is kept, not retired, because the sign-up flow is still wanted.
create table if not exists public.workshop_registrations (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  name           text not null,
  email          text not null,
  org            text,
  message        text,
  workshop_slug  text,                       -- what the form submitted
  workshop_id    uuid,                       -- see note above: no FK here
  source_page    text,
  status         text not null default 'new' -- new | contacted | archived
);

-- ========== 2c. Staff allowlist ==========
-- One email per member of staff. Nothing in this repo reads it; a single-column
-- email table is the shape an RLS policy uses to decide who may read the form
-- intake, and the policy that does so is not in this repo either.
--
-- So this declares the table and grants nothing. RLS on with no policy means
-- anon can neither read nor write it, which is the only safe default for an
-- allowlist — the service role bypasses RLS, so anything server-side that
-- reads it keeps working. If the live database has a policy here, it is not
-- named below and is left alone.
-- No addresses here. `is_staff()` is false for everybody until the list is
-- bootstrapped, and who has admin access is per-deployment rather than part of
-- the schema — so it lives in `seed-staff.sql`, which is gitignored the way
-- `.env.local` is, and which `npm run supabase-setup` folds in when present.
create table if not exists public.staff_emails (
  email text primary key
);

alter table public.staff_emails enable row level security;

-- ========== 2d. Staff access to the intake tables ==========
-- Who may read what visitors sent, and move it through review.
--
-- The allowlist above is the list; this is what consults it. A policy cannot
-- simply select from `staff_emails`, because that select is subject to
-- `staff_emails`' own RLS, which denies everyone — so the check goes through a
-- `security definer` function, which runs as the function's owner and can see
-- the table. `set search_path` is not optional on such a function: without it a
-- caller can point `public` at a schema of their own and decide for themselves
-- what `staff_emails` means.
--
-- Execute is granted to `authenticated` alone. `anon` never needs to ask
-- whether it is staff, and being able to ask is a way of testing the list.
create or replace function public.is_staff() returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.staff_emails
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke execute on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;

-- Read and review, not delete. A submission is someone's account of something
-- that happened to them; declining it is a status, not an erasure, and the row
-- stays for whoever has to answer for that decision later.
drop policy if exists "staff read stories" on public.stories;
create policy "staff read stories" on public.stories
  for select to authenticated using (public.is_staff());

drop policy if exists "staff review stories" on public.stories;
create policy "staff review stories" on public.stories
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read submissions" on public.submissions;
create policy "staff read submissions" on public.submissions
  for select to authenticated using (public.is_staff());

drop policy if exists "staff review submissions" on public.submissions;
create policy "staff review submissions" on public.submissions
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read registrations" on public.workshop_registrations;
create policy "staff read registrations" on public.workshop_registrations
  for select to authenticated using (public.is_staff());

drop policy if exists "staff review registrations" on public.workshop_registrations;
create policy "staff review registrations" on public.workshop_registrations
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- Staff may read the allowlist itself, so the review page can tell someone who
-- signed in and is not on it apart from someone whose session simply expired.
drop policy if exists "staff read allowlist" on public.staff_emails;
create policy "staff read allowlist" on public.staff_emails
  for select to authenticated using (public.is_staff());

-- From schema.sql section 3, which is where the intake tables have their RLS
-- switched on. It belongs in this migration too: the staff policies above are
-- inert while RLS is off, and worse, a table with RLS off and the default
-- Supabase grants is readable by the anon key -- so shipping the policies
-- without this line would leave every sign-up's name and email public.
-- Same rule for the workshop sign-up: anyone may register, nobody may read
-- back who else did.
alter table public.workshop_registrations enable row level security;

drop policy if exists "anon can register" on public.workshop_registrations;
create policy "anon can register" on public.workshop_registrations
  for insert to anon with check (true);
