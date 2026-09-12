# AGENTS.md

Project conventions for AI assistants (Claude Code and friends). **Edit this file
directly** — it is the single source of truth, and `.claude/hooks/inject-rules.mjs`
re-injects it on every prompt, so a change here takes effect on the very next message.

## Reply language

- Reply to me in **English**.
- Not affected: the website's own copy. The site is trilingual — **EN / KO / zh-TW**
  (i18next, `app/src/i18n/resources/`). That is unrelated to the language you reply
  in; never touch page copy because of this rule.

## Shell: Windows PowerShell 5.1

- **No `&&` and no `||`** — this is Windows PowerShell 5.1, where both are a syntax error.
  - Sequential: `cmdA; cmdB`
  - Only if the previous succeeded: `cmdA; if ($?) { cmdB }`
- No `?:`, `??` or `?.` either.
- Supabase CLI: do not `cd`, pass `--workdir` — `npx supabase db push --workdir app`
  (the project config lives in `app/supabase/`).

## Project conventions

(Add your own rules here — build commands, code style, directories to leave alone.)
