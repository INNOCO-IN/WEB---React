# Connecting the forms to Supabase

Two forms are meant to write to your Supabase project:

| Form | Page | Table |
|---|---|---|
| Connect / inquiry | `site/Are-you-IN.EN.dc.html` | `submissions` |
| Story submission | `site/Story-Submission.EN.dc.html` | `stories` (+ `story-media` storage bucket) |

⚠ Not currently wired: no page in `site/` loads `in-supabase.js`, so neither
form reaches Supabase yet. The setup below is still correct, but a
`<script src="in-supabase.js"></script>` has to be added to both pages.

## Setup — 3 steps

**1. Create the tables.** Supabase → SQL Editor → paste all of `schema.sql` → Run. This creates both tables, the RLS policies, and the public `story-media` storage bucket.

**2. Add your keys.** Open `site/supabase-config.js` and fill in:
```js
url:     'https://abcdefgh.supabase.co'
anonKey: 'eyJhbGci...'
```
Supabase → Project Settings → API. On Vercel these are also under Storage → Supabase → `.env.local` as `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Both values are safe in public code — RLS lets the anon key only **insert**, never read submissions.

**3. Redeploy.** Static site, no build step.

## Where the data lands

`submissions` — name, email, brings, message, source_page, status (`new`)
`stories` — door, body, format[], arc_stage, credit_name, email, consent, attachment_url, status (`pending`)

Read them in Supabase → Table Editor. Move a story's `status` to `published` and it becomes readable by the site (the Story index / Constellation can then fetch it).

## What changed in the forms

- **Are you IN?** — added `data-in-form="submissions"` + a hidden spam honeypot. Fields already had names; nothing visual changed.
- **Story Submission** — the step stack is now a real `<form>`; the two doors and both chip rows are click-to-select (selected chip fills ink-on-paper, selected door gets an ink outline); story / email / consent are required; the attachment `<image-slot>` became a real file input so uploads actually reach Storage — it now accepts video and audio too, which the copy promises. "Send my story" is a submit button instead of a link to Story.

## Notes

- Attachments go to the public `story-media` bucket. If you'd rather they stay private, drop the "public reads story media" policy and serve via signed URLs.
- No file-size cap is enforced client-side; Supabase's default is 50 MB per file.
- Errors surface inline next to the button and log to the console as `[IN → Supabase]`.
- Same pattern extends to any new form: add `data-in-form="table"`, name the fields after the columns, done. `in-supabase.js` picks it up automatically.
