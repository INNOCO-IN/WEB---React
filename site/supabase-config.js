/* IN Website — Supabase connection.
   Only the project URL and the publishable (anon) key belong here. Both are safe
   to expose: the RLS policies in schema.sql let this key INSERT only — it can
   never read submissions. Never put the service_role or secret key in this file. */
window.IN_SUPABASE = {
  url: 'https://kuwqaajqvwyzygxkiwab.supabase.co',
  anonKey: 'sb_publishable_M7Io-gVZ_gxkXeyeRcdywQ_AeHhR3Y7',
  bucket: 'story-media'
};
