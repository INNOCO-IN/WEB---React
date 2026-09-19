/**
 * Which stories are on the wall at the foot of /story, and in what order.
 *
 * Two callers, one rule. The page asks it to draw the cards
 * (`logic/StoryEN.ts`, which both Story pages use) and the review desk asks it
 * to say which entries are currently on the wall — so it lives here rather than
 * in either of them, for the reason `story-promotion.ts` does: the moment the
 * desk's idea of the wall and the page's idea of the wall are two pieces of
 * code, they are one edit away from disagreeing, and the disagreement would
 * show up as a reviewer pinning a card that never appears.
 *
 * No I/O and no React. Given rows, it returns rows.
 */

/** How many the design draws. The whole collection is one click away, at /story/all. */
export const WALL_CARDS = 12;

/**
 * What the wall needs to know about a story, and nothing else.
 *
 * Structural, so both shapes satisfy it: a `StoryEntry` as the site reads it,
 * and whatever the desk hands over for a `story_entries` row. Optional
 * `wallOrder` because the bundled collection has no such column at all — it is
 * a curation, and `site/data/stories.js` has no opinion about it.
 */
export interface WallItem {
  wallOrder?: number | null;
  /** ISO day. The tiebreak, and the whole ordering until somebody pins one. */
  date: string;
}

/**
 * The twelve, in the order the wall shows them.
 *
 * Both halves of the editorial question — which cards, and in what order — are
 * answered by one nullable column. `wallOrder` is null on every entry until
 * somebody pins one at the desk, and a number is a *rank* rather than a slot:
 * pinned cards come first, in ascending order, and the slots left over are
 * filled by date exactly as they always were. Twelve pins leave the date
 * nothing to fill, which is how "which twelve" gets answered without a second
 * column for a row to contradict this one with. See
 * 20260919160000_the_wall_on_story.sql.
 */
export function wall<T extends WallItem>(items: T[], cards = WALL_CARDS): T[] {
  return [...items].sort(byWall).slice(0, cards);
}

/**
 * The same order as a comparator, for a caller that wants all of them.
 *
 * The desk lists the whole collection in the order the wall would take it, so
 * it sorts rather than slices. Exported rather than re-typed there, because two
 * copies of this comparison would be one edit away from the desk and the page
 * disagreeing about which card comes first.
 */
export function byWall(a: WallItem, b: WallItem): number {
  // Unpinned sorts as Infinity rather than as 0, so a collection nobody has
  // curated — which is every one of them today, and the bundled copy always —
  // stays in date order. `undefined` lands here too, from a database that has
  // not run the migration that adds the column.
  const rank = (item: WallItem) => item.wallOrder ?? Infinity;

  return rank(a) - rank(b) || b.date.localeCompare(a.date);
}
