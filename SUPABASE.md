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

The generated types are not wired into the client yet, because a file that only
exists after `db:types` cannot be imported by a repo that must build before
anyone has run it. Once the types are committed, `src/lib/supabase.ts` becomes
two lines typed instead of one untyped, and `.from('news')` starts knowing its
own columns. The comment there spells it out.

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

`supabase init` also left `app/supabase/config.toml`. Most of its 400-odd lines
configure a local Docker stack we do not run, and it is kept unedited apart from
`project_id`, so that a future CLI upgrade has the shape it expects. The link
itself lands in `app/supabase/.temp/`, which is gitignored — so linking is
per-machine, and cloning this repo does not inherit anyone's project.

## Where the data lands

`submissions` — name, email, brings, message, source_page, status (`new`)
`stories` — door, body, format[], arc_stage, credit_name, email, consent, attachment_url, status (`pending`)

Read them in Supabase → Table Editor. Move a story's `status` to `published` and it becomes readable by the site (the Story index / Constellation can then fetch it).

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
