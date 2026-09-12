// UserPromptSubmit hook: re-inject AGENTS.md on every prompt, so the project
// rules stay in context instead of drifting out of it over a long session.
//
// This script holds no rules of its own — editing AGENTS.md is the whole
// interface. It must never block a prompt, so every failure exits quietly.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

let rules
try {
  rules = readFileSync(join(root, 'AGENTS.md'), 'utf8').trim()
} catch {
  process.exit(0)
}

process.stdout.write(
  JSON.stringify({
    suppressOutput: true,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: `Project rules from AGENTS.md. They apply to this turn:\n\n${rules}`,
    },
  }),
)
