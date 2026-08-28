/**
 * The pieces a detail page is built from.
 *
 * Shared by the generated `project-details.ts` and `community-details.ts`, so
 * the two families describe the same parts the same way and a template can be
 * read against either without translating between two spellings of a fact.
 */

/** One card under the brief — a word, and a line about it. */
export interface BriefFact {
  label: string;
  body: string;
}

/** The one link a detail page offers onward, where it has one. */
export interface DetailLink {
  label: string;
  to: string;
}
