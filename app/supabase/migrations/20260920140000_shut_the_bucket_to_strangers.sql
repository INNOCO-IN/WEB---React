-- Shut the story-media bucket to strangers: no more anonymous enumeration.
--
-- The bucket holds two very different things under one roof. The images on
-- published stories are read by anon on pages nobody signs in to. The raw
-- attachments a visitor adds to a submission are somebody's account of
-- something that happened to them, and must not be public until -- if ever --
-- a reviewer publishes them.
--
-- schema.sql §4 gave the bucket a single `for select to public` policy. On a
-- `public = true` bucket that policy does NOT gate downloads: the
-- /object/public/ route serves those without consulting RLS, and that is what
-- keeps published images rendering. But the same policy DOES gate the list
-- endpoint. So `to public` handed any unauthenticated caller
-- `POST /storage/v1/object/list/story-media` -- the full set of object names --
-- and the uuid filenames that were meant to be unguessable became a directory
-- to walk and download one row at a time. Measured on the local stack: the anon
-- key alone, the one that ships in the browser bundle, listed every attachment
-- already in the bucket and fetched each with no credentials at all.
--
-- The fix is to remove the ability to *list*. Downloading a known object stays
-- public -- published images need it, and the /object/public/ route ignores
-- this policy regardless -- but you can no longer ask the bucket what it holds
-- unless you are staff. The only pointer to an unpublished attachment is the
-- uuid in its `submissions` / `stories` row, and that row is already behind
-- is_staff().
--
-- The bucket stays `public = true` on purpose. Flipping it to private would put
-- RLS back in charge of downloads and break every published image, because the
-- public pages that render them carry no session to authorise with. Serving
-- published media from a private bucket -- a second, public bucket for approved
-- images, or signed URLs minted by something holding a key -- is a larger change
-- and a design decision, not a security patch, and is deliberately left out of
-- this one.

drop policy if exists "public reads story media" on storage.objects;

-- Enumeration is staff-only now. Downloads on a public bucket never consult this
-- policy; the list endpoint does. Nothing in the app lists this bucket today, so
-- this grants a capability rather than restoring one -- on purpose, so a future
-- staff media view needs no migration, while anon and uninvited sessions get
-- nothing. `is_staff()` already means aal2 under the `required` policy, so the
-- second factor guards the file list exactly as it guards the rows.
drop policy if exists "staff lists story media" on storage.objects;
create policy "staff lists story media" on storage.objects
  for select to authenticated using (bucket_id = 'story-media' and public.is_staff());
