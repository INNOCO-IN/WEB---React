/**
 * The promotion derivation, for the two scripts that render or write SQL.
 *
 * The logic moved to `src/lib/story-promotion.ts` when the review desk grew a
 * publishing flow of its own: a browser cannot import out of `scripts/`, and of
 * the three callers the desk is the one that ships, so the shape it uses should
 * not be a copy of the one the scripts use. Node strips the types, so this file
 * is now a re-export and both scripts keep the import they had.
 *
 * Anything added here rather than there is a fourth opinion about what a
 * published story looks like. Add it there.
 */

export {
  DOOR_TOPIC,
  FORMATS,
  TOPICS,
  buildEntry,
  buildPoint,
  copyOf,
  formatOf,
  paragraphs,
  slugify,
  titleFrom,
  topicFor,
} from '../../src/lib/story-promotion.ts';
