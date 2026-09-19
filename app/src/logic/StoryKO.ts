import useLogic from './StoryEN';

/**
 * Story.KO — the same four cards, and the same collection, as the English page.
 *
 * Which card the reader is pointing at is not a thing that differs by language,
 * and neither is which stories are published: the hook reads the locale off the
 * route and takes the `ko` side of each row.
 */
export default useLogic;
