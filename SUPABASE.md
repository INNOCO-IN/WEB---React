# Connecting the forms to Supabase

Three forms write to your Supabase project:

| Form | Static page | React route | Table |
|---|---|---|---|
| Connect / inquiry | `site/Are-you-IN.EN.dc.html` | `/connect`, `/ko/connect` | `submissions` |
| Story submission | `site/Story-Submission.EN.dc.html` | `/story/submit` | `stories` (+ `story-media` bucket) |
| Workshop sign-up | — | every `/workshop/…` detail page | `workshop_registrations` |

The first two are wired and verified in both trees. The workshop sign-up is
`app/` only: it is a React component in the `#register` band that every
workshop page already had, and the static pages under `site/` still offer the
two links that band used to hold. Adding it there is one
`data-in-form="workshop_registrations"` per page — `in-supabase.js` needs no
change, and the table's insert policy is already in place either way.

**In `site/`** the forms are driven by `in-supabase.js`, which scans for
`data-in-form="table"` and reads each field's `name` as its column. Those two
script tags carry a `?v=1` cache key; the static site has no build step, so
nothing hashes filenames — bump that number on all three pages whenever you
edit `in-supabase.js`, or returning visitors keep running the old copy.

**In `app/`** the same convention became a component. `<SupabaseForm
table="stories">` owns the submit, the upload and the status line, and
`<ChipGroup name="format" multi>` owns the chip rows — which exist because
`format` is a `text[]` and no HTML control means "array". The chips are real
`<button>`s now rather than `<span>`s, so they work from the keyboard.

Adding a field is still just adding an input whose `name` matches the column.

### What a value may be

A `<select>` without an explicit `value` sends its visible text. Three editions
of the same page then send three different strings for the same answer, and the
review desk sorts one kind of enquiry into three buckets depending on which
language the sender happened to be reading. So **every option carries a stable
slug**:

```html
<option value="keep-me-posted">Just keep me posted about events</option>
<option value="keep-me-posted">행사 소식만 받아볼게요</option>
```

The column holds the slug; the sentence is the page's, and a translator may
change it freely.

### Two attributes the page owns

Both spell a condition the same way, `field=value`, for the same reason — a
rule must never name a sentence:

| Attribute | Sits on | Means |
|---|---|---|
| `data-hide-when="brings=keep-me-posted"` | a block inside the form | that answer retires this question — hide it, and clear what it holds, because hidden is not absent and a message the visitor believes they took back would otherwise still be sent |
| `data-prefill="brings=keep-me-posted"` | a link elsewhere on the page | scrolling to the form also answers that question |

`data-in-idle` is the status line's resting text — the page's promise to write
back. It is an attribute rather than text inside the `data-in-status` slot
because the slot is replaced the moment the visitor presses send; written in
the markup the sentence would exist twice and agree only until somebody edited
one of them.

Both trees read these off the DOM: `in-supabase.js` in `site/`, and an effect
in `SupabaseForm.tsx` in `app/`.

> **Reading content is separate.** The tables the site *reads* — news,
> workshops, the IN-Collective roster, projects, communities, stories — are
> documented in [`CONTENT.md`](CONTENT.md), along with how each page stays
> subscribed to them so an edit shows up without a reload. Apart from Setup and
> The CLI, which cover the database as a whole, this file is about the two
> forms that write.

## Setup — 3 steps

These three set up a **hosted** project. To work against a database on your own
machine instead, none of this is needed — skip to **The local database**.

**1. Create the tables.** Generate the setup file, then paste all of it into
Supabase → SQL Editor → Run:

```bash
cd app && npm run supabase-setup
```

This creates the form tables, the content tables, the RLS policies, the public
`story-media` bucket, and turns on realtime — then seeds the content. Safe to
re-run. If you only want the structure and none of the content, paste
`schema.sql` on its own instead; it is the first section of the same file.

**2. Add your keys.**

For `site/`, open `site/supabase-config.js`:
```js
url:     'https://abcdefgh.supabase.co'
anonKey: 'eyJhbGci...'
```

For `app/`, copy `app/.env.example` to `app/.env.local`:
```
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

Supabase → Project Settings → API. Both values are safe in public code — RLS
lets the anon key **insert** into the three form tables and **read** only rows
marked live. It can never read a submission, a story in review, or a sign-up.

If `app/.env.local` is missing, the React app still runs: it renders its
bundled content and the forms say so rather than failing silently.

**3. Redeploy.** The static site has no build step. The React app builds with
`cd app && npm run build`.

## The CLI

`supabase` is a `devDependency` of `app/`, pinned like everything else there, so
there is no global install to keep in step with the project — `npx supabase` and
the scripts below use the pinned copy.

```bash
cd app
npm run db:login   # once per machine — opens the browser
npm run db:link    # once per checkout — pick the project
npm run db:types   # after any schema change
```

`db:types` writes `src/lib/database.types.ts` from the **linked project's** live
schema, which is the one authority on what the columns actually are — `schema.sql`
is what we last asked for, not necessarily what is there. Commit the result: it
means a fresh checkout typechecks without anyone holding database credentials,
and CI never needs them.

The generated types **are** wired into the client: `src/lib/supabase.ts` calls
`createClient<Database>`, so `.from('news')` knows its own columns and a query
naming a column the database does not have fails at `tsc` rather than in
someone's browser. That is why the file is committed rather than generated on
demand — a repo has to build before anyone has run `db:types`.

Regenerate after every schema change. A stale `database.types.ts` is worse than
no types at all: it typechecks confidently against a shape the database no
longer has. Wiring the client up is also how three latent problems surfaced —
a form whose table was a bare `string`, an insert of an unvalidated row, and
`story_entries.en`/`ko` being read as a fixed shape when `jsonb` guarantees
only valid JSON.

**`npm run db:types` refuses to write unless the CLI both exits clean and returns
something that parses as TypeScript.** That is the whole reason it is a script in
`scripts/` rather than `... > database.types.ts` in `package.json`: shell
redirection empties the file *before* learning the command failed, so an expired
login would present as several hundred type errors instead of one line telling
you to log in again. It names the fix instead.

### Two ways to apply a change

`schema.sql` plus the four seeds stay the source of truth either way. What
differs is how they reach the project.

**Paste the bundle.** `npm run supabase-setup` → SQL Editor, as in the three
steps above. Needs no credentials beyond the dashboard, applies everything, and
is safe to re-run — so it is the answer for a first-time setup, and for anyone
without the CLI linked.

**Push a migration.** `app/supabase/migrations/` holds what has already been
applied to the linked project, each file either a copy of the root SQL or the
slice of it that one change needed:

```bash
cd app && npx supabase db push
```

Never edit a file that has been applied — add another. A push runs in a
transaction, so a migration that fails part-way leaves the database untouched
and stays unapplied; fix the file and push again. This is the better path for a
change to a database that already has content, because the diff says what
changed rather than restating the whole schema.

Both routes end at the same place, and neither owns the schema: the root SQL
does. `db:types` only ever *reads* it.

There is a third way, and it is the only one that rehearses anything: reset a
local database and watch the migrations replay onto an empty schema. See **The
local database** below.

## The local database

`npm run dev` talks to a Supabase running on this machine. Not to the hosted
project — that takes `npm run dev:live`.

The split exists because developing against the live database means rehearsing
on the one the site serves: the forms write real rows, `/review` moves real
statuses, and the schema in this repository is routinely ahead of what has been
pushed. A local copy is where all three are safe.

```bash
npx supabase start --workdir app   # once per boot; Docker Desktop first
npx supabase stop  --workdir app   # or leave it running
```

or `npm --prefix app run db:start` / `db:stop`, which is the same thing through
the pinned CLI.

| | |
|---|---|
| API | `http://127.0.0.1:54321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio — the table editor | `http://127.0.0.1:54323` |
| Mail — everything the stack "sends" | `http://127.0.0.1:54324` |

### Which database a command talks to

It is the Vite mode, not a file you edit before switching:

| Command | Reads | Database |
|---|---|---|
| `npm run dev` | `.env.devdb` | local |
| `npm run dev:live` | `.env.local` | hosted |
| `npm run build`, `npm run preview` | `.env.local` | hosted |
| `npm test` | neither | none — bundled content, forced in `vitest.config.ts` |
| `npm run signin-link` | `.env.devdb`, or `.env.local` with `--live` | local unless told otherwise |

`npm run dev` is `vite --mode devdb`, and Vite loads `.env.[mode]` *after*
`.env.local`, so `.env.devdb` wins wherever both name a variable. Nothing had to
be taken out of `.env.local` for this, and the default is the harmless one:
reaching the live database is a different command, not a forgotten edit.

**`.env.devdb` is committed, deliberately.** Every value in it addresses
127.0.0.1 and is signed with the local JWT secret the CLI publishes in its own
documentation (`iss: supabase-demo`), so it is identical on every machine and
grants nothing anywhere else. Committing it is what makes a fresh checkout's
`npm run dev` work with no credential handed over — the same argument as
`database.types.ts`. `.env.local`, which holds the hosted project's real keys,
stays gitignored.

Regenerate it from the stack rather than editing it:

```bash
npm --prefix app run db:env
```

Like `db:types`, it refuses to write unless the CLI exits clean and returns
something that parses — a stopped stack should cost you one line saying to start
it, not an `.env.devdb` with three empty values, which would look exactly like a
checkout with no keys and quietly serve bundled content instead.

### Resetting it

```bash
npm --prefix app run db:reset
```

Drops the local database, replays `app/supabase/migrations/`, then runs the
seeds `[db.seed]` names — the same root files `npm run supabase-setup`
concatenates, in the same order, minus `schema.sql` because the migrations
already *are* the schema.

That makes a reset the third way to apply a change, and the only one that is a
rehearsal: it proves a migration applies to an empty database **and** that the
seeds still load on top of it. A `db push` to the hosted project never gets
tested that way, because that database is never empty.

`seed-staff.sql` is in the list as a glob rather than a name, because it is
gitignored: a checkout without it resets to an empty allowlist instead of
failing on a missing file.

A reset also recreates `auth`, so the auth users you made locally go with it.

### Signing in locally

The local stack catches its own mail, so here the mailed link is the whole flow
— and it needs no service-role key:

1. Create the auth user once, because `shouldCreateUser: false` means the form
   will not: Studio → Authentication → Users → Add user, same address as
   `seed-staff.sql`. Or `npm --prefix app run signin-link -- you@example.com --create`.
2. `/review` → that address → open `http://127.0.0.1:54324` → click the link.

`site_url` and `additional_redirect_urls` in `config.toml` name
`localhost:5174` so the link is allowed to land on the dev server rather than
the CLI's default `127.0.0.1:3000`.

### What config.toml carries

`supabase init` left 400-odd lines. Eleven values in it are ours; everything else
is left untouched so that a future CLI upgrade has the shape it expects.

| | |
|---|---|
| `project_id` | names the containers |
| `[db.seed] sql_paths` | the root seeds, so a reset restores content |
| `[auth] site_url` + `additional_redirect_urls` | `localhost:5174`, so the sign-in link lands |
| `[auth.mfa.totp] enroll_enabled` + `verify_enabled` | the review desk's second factor; left false, enrolling 422s |
| `[auth.sessions] timebox` + `inactivity_timeout` | 12h / 2h, because the desk is read on borrowed computers |
| `[auth.captcha]` | Turnstile on the sign-in form; ships `enabled = false` until you have keys |
| `[auth] enable_signup` + `[auth.email] enable_signup` | **false** — without it a script self-registers past `shouldCreateUser` |
| `[edge_runtime] enabled = false` | no functions in this project |
| `[analytics] enabled = false` | nothing reads the local log pipeline, and it is the heaviest part of the stack |

`auto_expose_new_tables` is the one that stays commented out — see section 8 of
`schema.sql`. Turning it on would restore the privileges the schema used to get
for free, and it is removed on 2026-10-30, so the grants are written down
instead.

The link to the hosted project still lands in `app/supabase/.temp/`, which is
gitignored — so linking is per-machine, and cloning this repo does not inherit
anyone's project.

## Where the data lands

`submissions` — name, email, brings, message, source_page, status (`new`)
`stories` — door, body, format[], arc_stage, credit_name, email, consent, attachment_url, status (`pending`)
`workshop_registrations` — name, email, org, message, workshop_slug, source_page, status (`new`). No form posts to it yet; it and `workshops.id` are what a pre-port sign-up flow left behind.

Read them in the Supabase Table Editor, or at **`/review`** — see below.

## The review desk

`/review` is a staff page in the app. It lists the three intake tables, groups
each into waiting and handled, narrows them with a search and the fields each
form already collects, moves a row's status, and publishes a story to the site.
It has no locale, no nav, nothing links to it, and it is `noindex`: it is a tool,
not a page of the site, which is also why its route is written into `App.tsx`
rather than the generated `pages/registry.ts`.

Three screens sit under it — the queue, `/review/story/:id` for reading one
submission on its own, and `/review/publish/:id` for the publishing flow — all
behind the one session check. Rows are read live: the desk subscribes to the
three intake tables through the same `services/realtime.ts` the public pages use,
so a desk left open for an hour is not showing counts from when it loaded.

**Sign-in is a mailed link, never a password.** `signInWithOtp` with
`shouldCreateUser: false`, so the form cannot double as a registration form and
an unknown address gets the same answer as a known one. The app holds no secret
and has no password field.

**Access is the database's decision, not the page's.** `staff_emails` is the
allowlist, and `public.is_staff()` is what consults it — a `security definer`
function, because a policy cannot select from `staff_emails` directly: that
select is subject to `staff_emails`' own RLS, which denies everyone. Signing in
successfully and seeing an empty desk is the correct outcome for someone who is
not on the list, so the page asks whether you are staff and says so plainly
rather than leaving it looking like a slow network.

Staff may read and change status on `stories`, `submissions` and
`workshop_registrations`. They may not delete: a submission is someone's account
of something that happened to them, and declining it is a status rather than an
erasure.

Staff may also **write the two published tables** — `story_entries` and
`constellation_points` — which is what lets the desk publish a story rather than
only record that somebody decided to. Insert and update only, still no delete,
and still narrowed to `is_staff()` rather than to `authenticated`: a signed-in
visitor is a reader of the public site and carries that role too. The migration
is `20260914090000_staff_publish_stories.sql`, and it also adds
`stories.published_as` — the permalink a submission was published as, which is
the only thing connecting the two story tables and therefore the only way the
queue can say "on the site" instead of merely "published".

Those same grants are what lets the desk **edit a story that is already up**,
which `20260919160000_the_wall_on_story.sql` adds the two missing columns for.
`story_entries.wall_order` is which cards the wall at the foot of `/story`
shows, and in what order — null on every row until somebody pins one, and then
a rank rather than a slot, with the slots left over filled by date exactly as
before. `edited_at` / `edited_by` are the news queue's bargain again
(20260919104500): `seed-stories.sql` overwrites this table's words on every run
because `site/data/stories.js` has been their authority, so a row the desk has
written carries a mark and the generated upsert holds that row's columns back.
Hiding and pinning are deliberately *not* stamped — neither column is in the
seed, so no re-seed can undo them, and stamping would freeze a row's words
against `site/` as a side effect of deciding where it sits.

**The allowlist is not in the repository.** It lives in `seed-staff.sql`, which
is gitignored for the same reason `.env.local` is: who has admin access differs
per deployment and does not belong in git history. `npm run supabase-setup`
folds it into the bundle when it is there, and a checkout without it produces a
schema with an empty allowlist — so nobody can sign in, which is the honest
result of not having said who may.

Adding a reviewer is two steps, and the second is easy to forget:

1. Add the address to `seed-staff.sql` and apply it.
2. Create the auth user in Supabase → Authentication → Users, same address.

`shouldCreateUser: false` means the sign-in form will not do step 2 for you —
that is the point of it. An address on the list with no auth user gets a link
that signs nobody in.

There is no third step for the second factor: the reviewer enrols themselves,
the first time they sign in. See below.

## The second factor

The link is one factor and it is a mailbox, so whoever holds the mailbox holds
the desk. `20260919180000_second_factor_on_the_desk.sql` adds the second: TOTP,
from any authenticator app.

**It is `is_staff()` that enforces it, not the page.** That function now asks
two questions instead of one — are you on the list, and is this session strong
enough — so every policy written against it since 20260903090000 gained the
second factor without being touched, and so will the next table somebody adds.
A session that skipped the code is refused by the database; the screens in
`src/review/SecondFactor.tsx` only explain that and get the token upgraded.
`aal` is GoTrue's own claim, so it is a fact the browser cannot assert about
itself — which is the whole reason this is worth having over a page-level gate.

Not a second email, and not SMS. A code mailed to the same mailbox is one break
away from being no second factor at all, and Supabase has no email factor to
raise `aal` with, so the database could not see it even if it were worth
having. SMS needs Twilio, costs money per message, and is the weakest of the
three.

### How hard it bites

One row, `public.review_policy`, so that applying the migration changes nothing
on the day it lands:

| | |
|---|---|
| `off` | one factor again |
| `enrolled` | **the default.** A factor must be used *if you have one*. Nobody is compelled, so this is a migration path rather than a policy |
| `required` | every reviewer holds a factor and reaches `aal2` |

```sql
update public.review_policy set second_factor = 'required', changed_at = now();
```

Flip it when the reviewers have actually been told. Under `required` anyone
without a factor sees the enrol screen instead of the queue until they finish —
**enrolling is self-serve at `aal1`, so nobody is permanently locked out** and
no admin is needed to onboard anybody. That is what stops `required` being a
trap.

Readable by anyone signed in, writable by nobody: it says how the door works,
not who may open it, and a stolen session must not be able to switch its own
second factor off.

### The lost phone

Deliberately not self-serve. Everything a reviewer could prove on that screen
is control of the mailbox, which is the *first* factor — so a "lost your
device?" button there would be a second door opened by the same key. Recovery
is a person who can satisfy themselves about who is asking, by some channel
that is not email:

```bash
npm --prefix app run mfa-reset -- them@example.com              # list, changes nothing
npm --prefix app run mfa-reset -- them@example.com --remove     # take it off
npm --prefix app run mfa-reset -- them@example.com --remove --live
```

Local by default, `--live` for the hosted project, same as `signin-link` and
for the same reason: `--remove` writes, and guessing wrong locks a reviewer out
of production. Removing a factor puts them back where a new starter is; it
grants nothing, because `staff_emails` still decides who may read anything.

## The CAPTCHA on the sign-in form

`shouldCreateUser: false` already means an uninvited address gets no mail, and
the form answers the same way either way, so the allowlist cannot be read one
guess at a time. What was left was **volume**: the rate limits allow 30 sign-in
requests per IP per five minutes, which is plenty for a script to keep mailing a
real reviewer a real sign-in link all day and then phish one of them. Cloudflare
Turnstile is aimed at that and at nothing else — a determined person targeting
one known mailbox is the second factor's problem, not this one.

**It is one switch in two places, and they must agree.**

| | where | which key |
|---|---|---|
| the widget | `VITE_TURNSTILE_SITE_KEY` in `app/.env.local` | **site** key — public, in the browser bundle by design |
| the check | `[auth.captcha]` in `config.toml`, or Authentication → Settings on a hosted project | **secret** key — never `VITE_`, never the browser |

Enabled on the project with no site key in the build, every sign-in fails with
`captcha protection: request disallowed`. Enabled in the build with the project
switched off, the token is ignored. **Turn both on together or neither** — and
note that `[auth.captcha] enabled` ships as `false`, so nothing changes until
you have a real key pair from Cloudflare → Turnstile → Add site (free).

Verified against Cloudflare's published test keys: with the always-pass secret a
sign-in with no token at all is refused `captcha_failed`, and with the
always-fail secret even a token the widget really produced is refused
`invalid-input-response` — so the check is Supabase calling Cloudflare, not the
page marking its own homework.

A refused CAPTCHA is the one server error the form repeats verbatim. Everything
else collapses into "check your mail" so the form cannot be used to test the
allowlist; this one cannot, because it says nothing about whether the address
exists, and the alternative would leave a reviewer waiting on a link that was
never sent.

**The widget is re-armed after every attempt, successful or not.** A Turnstile
token is single use, so a form that keeps one after spending it tells the next
attempt it failed a puzzle it already solved. That reset is the thing to
preserve if this screen is ever rewritten.

## Sessions time out

`[auth.sessions]` — `inactivity_timeout = "2h"` and `timebox = "12h"`.

The desk gets read on borrowed computers, and the failure mode there is somebody
forgetting to sign out and walking away; "Sign out" is on every screen but
cannot be relied on to be pressed. Two hours is long enough that nobody is
thrown out mid-review and short enough that a borrowed machine is not left
holding a live desk all afternoon. Both apply on the reviewer's own machine too,
where the cost is re-entering a TOTP code.

Worth knowing what a borrowed computer does and does not hold: the link goes to
a mailbox and the code comes off a phone, so **the machine never holds both
factors** — which is the part that makes signing in somewhere else reasonable at
all. What it does hold is a live session, and that is what these two settings
close.

### Who may sign in at all

Two places, and both are needed — neither alone gets anybody in:

| | controls | where |
|---|---|---|
| auth user | whether a link can be **received** | Authentication → Users, or `signin-link --create` |
| `staff_emails` | whether anything can be **seen** | `seed-staff.sql` |

An auth user not on the list signs in to an empty desk. An address on the list
with no auth user never gets a link. There is no third place.

**`enable_signup = false` is what makes the first row true, and it was not set
until 2026-09-20.** `shouldCreateUser: false` lives in our client, so it only
governs what our own page asks for — it is a field in a request body, and a
script skips the page and sends `create_user: true` with the public anon key
instead. Measured on the local stack before the flag was set: a stranger put
themselves in `auth.users` and Mailpit received a real "Your sign-in link"
addressed to them. They could not read anything, because `staff_emails` is what
RLS consults — but they held an account on the project and could have it mail
them on demand, which on a hosted project is our sending reputation.

It is set in two places in `config.toml`, `[auth]` and `[auth.email]`, because
the provider does not inherit the project-level flag. Both now refuse with
`signup_disabled`, by `POST /auth/v1/otp` and by `POST /auth/v1/signup` alike.

**A hosted project has its own copy of this setting and does not read
`config.toml`** — Authentication → Sign In / Providers → "Allow new users to
sign up". Turning it off here does nothing there. Check it.

Creating reviewers is unaffected: the admin API bypasses the flag, so
`signin-link --create` and Authentication → Users keep working. Verified after
the change.

One consequence, and it is the right trade: with signups off, `POST /auth/v1/otp`
answers **200 for a known address and 422 `otp_disabled` for an unknown one**, so
the API distinguishes them where it used to return 200 either way. That is an
enumeration oracle for anyone scripting the endpoint, and it is why the CAPTCHA
matters — it makes the script pay per guess. Our own form gives nothing away:
`lib/sign-in.ts` collapses every "no such account" refusal onto the same neutral
screen as a success, and `review/sign-in.test.ts` pins that with the exact
strings the server returned. The alternative — leaving signups on — trades a
guessable address for a working account and a mail relay, which is worse.

### Turning it on for a hosted project

MFA has to be enabled on the project as well as in this repo — Authentication →
Providers → MFA, or the TOTP lines in `config.toml` for the local stack. Left
off, enrolling fails with a 422 and the enrol screen says so. **Enabling TOTP
in `config.toml` needs a full `supabase stop` / `start`**: the CLI bakes those
values into the auth container's environment at start, so a container restart
alone keeps the old ones.

### Signing in during development

Against the **local** stack the mailed link is the flow: that stack catches its
own mail at `http://127.0.0.1:54324`. See **The local database** below.

Against a **hosted** project it does not work, and is not meant to. The
built-in mailer is rate-limited to a few messages an hour and is not a delivery
service, so the link either never arrives or arrives long after you needed it.
The client cannot print it either: it asks for one to be *sent* and never sees
it.

So mint one directly instead. Nothing is emailed:

```bash
npm --prefix app run signin-link -- you@example.com --create          # local
npm --prefix app run signin-link -- you@example.com --create --live   # hosted
```

**It targets the local stack unless you pass `--live`**, and it prints which
project it is talking to before it does anything. `--create` writes, so the
default being the local one is the difference between a throwaway auth user and
a real one in the live project.

The link goes to stdout; everything else goes to stderr, so it can be piped.
`--create` also creates the auth user when there is not one, which covers step 2
above. `--redirect=` changes where the link lands (default
`http://localhost:5174/review`). The link is single-use and expires.

This needs the **service-role key**, which bypasses RLS on every table. It is
read as `SUPABASE_SERVICE_ROLE_KEY` from `app/.env.devdb` for the local stack
(already there — `npm run db:env` writes it) or `app/.env.local` for the hosted
project (yours to add) — **without** a `VITE_` prefix, because that prefix is
exactly what puts a variable into the browser bundle. Nothing under `src/` reads
it, and it does not appear in `dist/`.

Signing in is still not the same as being let in: RLS checks `staff_emails`, so
apply `seed-staff.sql` too or the desk will be empty. And in development the
sign-in form now reports the real error instead of "check your mail" — that
reassuring message is right in production, where saying "no such user" would
turn the form into a way of testing the allowlist, and useless locally, where
"no such user" and "no SMTP" both look like a link that never came.

## Reviewing a story

Moving a story's `status` to `published` makes it readable by the anon key. It
does **not** put it on the site: no page reads `stories`. The Story index reads
`story_entries`, which is a different table — what a visitor sent versus what the
index publishes.

The gap between them is editorial, not technical. The form asks for a body, a
door and a format. An index entry needs a permalink, a title, a topic and an
eyebrow, and none of those are collected, which is why a person promotes a
story rather than a trigger.

**The usual way is now the desk.** `Publish →` on a story row opens
`/review/publish/:id`, where those four get written with the story open beside
them, and the last look names what the press does before it does it: the index,
the story page, the Korean page, and the Constellation if it was asked for. One
press writes the entry, optionally places the point, and marks the submission
`published` — recording the permalink in `stories.published_as` so the queue can
afterwards say *on the site* rather than only *published*.

**Afterwards is the same row.** The stories tab lists both tables as one list,
joined on `published_as`, so a story that is up carries the actions for looking
after it: correcting a headline in either edition, changing the date, topic or
format, replacing the picture, taking it off the site and putting it back,
marking it still being written, and curating the wall at the foot of `/story`.
The picture can be uploaded rather than only addressed — into `story-media`,
whose insert policy already covers `authenticated`, under a uuid filename and
leaving the file it replaces in place, because a picture may be in use
somewhere this screen cannot see. `Pin these 12` is
the press that turns "the twelve most recent" into "these twelve": once every
slot is pinned, publishing a thirteenth story no longer pushes one off — so a
newly published submission reaches the wall only by being pinned, and pinning
puts it at the front. The publishing screen says which of the two states the
wall is in before the press, because the alternative is finding out by looking
at an unchanged page. Every
such row says which authority it answers to, because an edited row stops
following `site/data` — and it says what was decided in the queue separately
from where the story is, because those two come apart.

**A story with no submission behind it** is written at `/review/add`. Same
table, same builder (`composeEntry` in `app/src/lib/story-promotion.ts`, which
both roads now go through), and the staff `insert` policy from 20260914090000 is
what allows it — no migration. Three differences from publishing a submission:
it is an insert rather than an upsert, so a permalink that already exists is
refused rather than silently overwriting a story nobody re-read; the row is
stamped `edited_at`, because the desk wrote every word of it; and the
Constellation point is **on by default**, since a story the desk sits down to
write is being put on the site deliberately.

The two below remain, and are still the right tool in two cases: when you would
rather read the SQL before running it, and when you are working on your own
machine and would rather not type a headline at all.

```bash
npm --prefix app run promote-story -- row.json --slug=the-chairs-moved --title="The chairs moved themselves" --topic=noticed --context="A closing circle"
```

Copy the row out of the Table Editor as JSON and hand it over. The script fills
what the row already answers — the eyebrow's first half from the door, the
credit, the date, the format, the body split into paragraphs, the attachment as
the image — and refuses to emit anything until the four editorial fields are
given. It never emits a placeholder, and it never touches the database: the SQL
goes to stdout for you to read, and the notes go to stderr so `> entry.sql`
gives you a clean file.

Without `--ko-title` / `--ko-blurb` / `--ko-body` the English copy is carried
into the `ko` column so the Korean page renders something, and it tells you it
did.

### Locally: approve and it is live

Refusing to guess is right for the site and three commands too many while you
are working on your own machine, so there is the other end of that trade:

```bash
npm --prefix app run promote-watch
```

It watches `stories`, and the moment a row's status becomes `published` — from
`/review`, from Studio, from anywhere — it derives an entry, writes it to
`story_entries` and places a point on the map. An open `/story/all` is
subscribed to that table, so the story arrives about a second later with no
reload. Submit, approve, done.

What it derives, and how wrong it can be:

| | |
|---|---|
| **title** | the first sentence of the body, cut at a word boundary |
| **slug** | that title, hyphenated — it is the permalink, so it is the one worth a look |
| **topic** | the door, where the door is a topic. `lived` and `noticed` are; `imagined`, `were told` and `can't say` are not, so those land in `blog` or `family` and the line says it guessed |
| **format** | the first format chip, or `writing` when the form collected none |

The rest is the derivation `promote-story` already does. All three — this, that,
and the desk's publishing flow — read
[`src/lib/story-promotion.ts`](app/src/lib/story-promotion.ts), so the row this
writes, the row that one prints and the row the desk sends cannot drift apart.
It lives under `src/` because the browser is the caller that ships and cannot
import out of `scripts/`; Node strips the types, and
`scripts/lib/story-promotion.mjs` is a re-export so both scripts keep the import
they had.

**It refuses to run against anything but a local stack**, and the check is the
URL rather than a flag. A guessed headline is a fine thing to put on a
development database and not a thing to put on the site — publishing there stays
`promote-story`, where a person types the title.

It does not overwrite, either: a submission whose entry already exists is left
alone, so a title you corrected in Studio stays corrected. `--force` rewrites,
`--once` sweeps what is already published and exits, `--no-constellation` leaves
the map out of it.

Two things it does on purpose. It **sweeps on start**, so anything approved while
it was not running is picked up the next time it is. And it never takes a story
*down*: moving a published row to `declined` logs a line and leaves the entry
where it is, because deleting an editor's work on a guess about what a status
change meant is not a watcher's decision to make.

## What changed in the forms

- **Are you IN?** — added `data-in-form="submissions"` + a hidden spam honeypot. Fields already had names; nothing visual changed. The "We'll be in touch soon." line doubles as the `data-in-status` slot, so sending / error text appears there.
- **Story Submission** — the step stack is now a real `<form data-in-form="stories">`. It previously had no `<form>` at all, no `name` on any field, and "Send my story" was an `<a href="Story.EN.dc.html">`, so a submitted story was discarded. Now: `body` / `email` / `consent` are required; all three chip rows (`door`, `format`, `arc_stage`) are click-to-select via `data-chip-group`; the fake `<image-slot>` is a real file input accepting image, video, audio and PDF, so uploads reach the `story-media` bucket; "Send my story" is a submit button.

### Chip group colours

`in-supabase.js` fills a selected chip ink-on-paper by default. A group can keep
its page's key colour with `data-sel-bg` / `data-sel-fg` / `data-sel-border` —
Story Submission uses the amber `#FAB414` from its hero. Unset falls back to the
default, so existing markup is unaffected.

## Notes

- Attachments go to the public `story-media` bucket. If you'd rather they stay private, drop the "public reads story media" policy and serve via signed URLs.
- No file-size cap is enforced client-side; Supabase's default is 50 MB per file.
- Errors surface inline next to the button and log to the console as `[IN → Supabase]`.
- Same pattern extends to any new form: add `data-in-form="table"`, name the fields after the columns, done. `in-supabase.js` picks it up automatically.
