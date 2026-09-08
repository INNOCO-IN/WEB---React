# Connecting the forms to Supabase

Two forms write to your Supabase project:

| Form | Static page | React route | Table |
|---|---|---|---|
| Connect / inquiry | `site/Are-you-IN.EN.dc.html` | `/connect`, `/ko/connect` | `submissions` |
| Story submission | `site/Story-Submission.EN.dc.html` | `/story/submit` | `stories` (+ `story-media` bucket) |

Both are wired and verified in both trees.

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
lets the anon key **insert** into the two form tables and **read** only rows
marked live. It can never read a submission.

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

`supabase init` left 400-odd lines. Six values in it are ours; everything else
is left untouched so that a future CLI upgrade has the shape it expects.

| | |
|---|---|
| `project_id` | names the containers |
| `[db.seed] sql_paths` | the root seeds, so a reset restores content |
| `[auth] site_url` + `additional_redirect_urls` | `localhost:5174`, so the sign-in link lands |
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
each into waiting and handled, and moves a row's status. It has no locale, no
nav, nothing links to it, and it is `noindex`: it is a tool, not a page of the
site, which is also why its route is written into `App.tsx` rather than the
generated `pages/registry.ts`.

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
