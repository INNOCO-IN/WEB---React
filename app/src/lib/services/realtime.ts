import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import type { ContentTable } from '../content/types';
import { reportChange, reportWatch } from './status';

/**
 * One shared Postgres-changes subscription per table.
 *
 * A change tells the site *that* something moved, not what to do about it, and
 * the listener refetches. Patching the local array from the payload would be
 * fewer bytes and wrong more often: the queries carry filters and an order
 * (`status = 'live'`, `published_at desc`, `contains(feeds, ...)`), and a row
 * that leaves the filter arrives as an UPDATE the page would have to know to
 * remove rather than replace. These tables are tens of rows; refetching is
 * cheap and cannot drift.
 *
 * Three details that are easy to get wrong:
 *
 * - **One channel per table, not per component.** The Community page mounts
 *   two components reading `news`, and Home mounts a third. Ref-counting keeps
 *   that at one socket subscription.
 * - **A burst is one refetch.** Pasting a seed file fires an event per row;
 *   the listeners are called once, after the burst stops.
 * - **Teardown lingers.** StrictMode mounts every effect twice in development,
 *   so an immediate unsubscribe on the first cleanup would tear the channel
 *   down and rebuild it on every navigation.
 *
 * With no Supabase keys configured this is a no-op that returns a no-op, so
 * callers do not branch on it.
 */

type Listener = () => void;

interface Watch {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
  coalesce?: ReturnType<typeof setTimeout>;
  linger?: ReturnType<typeof setTimeout>;
}

/** Long enough to swallow a multi-row write, short enough to feel immediate. */
const COALESCE_MS = 150;

/** Survives a StrictMode remount and a navigation between two pages that share a table. */
const LINGER_MS = 4000;

const watches = new Map<ContentTable, Watch>();

function open(table: ContentTable): Watch {
  const watch: Watch = { channel: undefined as unknown as RealtimeChannel, listeners: new Set() };

  reportWatch(table, 'connecting');

  watch.channel = supabase!
    .channel(`in-content-${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
      reportChange(table);
      clearTimeout(watch.coalesce);
      watch.coalesce = setTimeout(() => {
        // Copied before iterating: a refetch can unmount the component that
        // asked for it, which unsubscribes mid-loop.
        for (const listener of Array.from(watch.listeners)) listener();
      }, COALESCE_MS);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        reportWatch(table, 'watching');
        return;
      }
      if (status === 'CLOSED') {
        reportWatch(table, 'off');
        return;
      }
      reportWatch(table, 'error');
      if (import.meta.env.DEV) {
        console.warn(
          `[IN -> realtime] "${table}" is not being watched (${status}). ` +
            'The page still reads on load; run the realtime block at the end of schema.sql to enable live updates.',
        );
      }
    });

  return watch;
}

/**
 * Calls `onChange` whenever a row in `table` is inserted, updated or deleted.
 * Returns the unsubscribe.
 */
export function watchTable(table: ContentTable, onChange: Listener): () => void {
  if (!supabase) return () => {};

  let watch = watches.get(table);
  if (!watch) {
    watch = open(table);
    watches.set(table, watch);
  }

  clearTimeout(watch.linger);
  watch.linger = undefined;
  watch.listeners.add(onChange);

  const current = watch;
  return () => {
    current.listeners.delete(onChange);
    if (current.listeners.size) return;

    current.linger = setTimeout(() => {
      if (current.listeners.size) return;
      clearTimeout(current.coalesce);
      void supabase!.removeChannel(current.channel);
      // Only report and forget if this is still the live entry for the table.
      // Reporting unconditionally would mark a channel someone else has since
      // opened as closed.
      if (watches.get(table) === current) {
        watches.delete(table);
        reportWatch(table, 'off');
      }
    }, LINGER_MS);
  };
}
