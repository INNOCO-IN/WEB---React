import type { ContentTable } from '../content/types';

/**
 * What each table is currently doing, for the development overlay.
 *
 * Nothing on the public site reads this — it exists so that "is this page on
 * the database or on the bundled copy?" has an answer you can see, rather than
 * one you infer from whether a card looks stale. The fallback is deliberately
 * invisible to a visitor, which is exactly what makes it easy to ship a page
 * that has quietly been running on bundled content for a month.
 *
 * It is an external store rather than React state because the reporters are
 * plain functions in the service layer, called from outside any component.
 */

/**
 * Which copy of a table's rows the site is rendering.
 *
 * `absent` is separated from `bundled` because they need different answers.
 * Bundled means the query ran and had nothing to say; absent means the table
 * is not in the database yet, so no edit anywhere can reach the page and a
 * realtime subscription, though it succeeds, can never deliver anything.
 */
export type Source = 'bundled' | 'absent' | 'live' | 'error';

/** Whether row changes are reaching the site as they happen. */
export type Watch = 'off' | 'connecting' | 'watching' | 'error';

export interface TableStatus {
  table: ContentTable;
  source: Source;
  watch: Watch;
  /** Rows the last successful read returned. */
  rows: number;
  /** When a realtime change last arrived, as epoch ms. */
  changedAt: number | null;
}

const entries = new Map<ContentTable, TableStatus>();
const listeners = new Set<() => void>();

/** Rebuilt on every report so useSyncExternalStore sees a new identity. */
let snapshot: TableStatus[] = [];

function entry(table: ContentTable): TableStatus {
  let found = entries.get(table);
  if (!found) {
    found = { table, source: 'bundled', watch: 'off', rows: 0, changedAt: null };
    entries.set(table, found);
  }
  return found;
}

function publish(): void {
  snapshot = [...entries.values()].sort((a, b) => a.table.localeCompare(b.table));
  // Copied before iterating: a listener is free to unsubscribe itself, and
  // React's own store subscription does exactly that on unmount.
  for (const listener of Array.from(listeners)) listener();
}

export function reportSource(table: ContentTable, source: Source, rows = 0): void {
  const status = entry(table);
  if (status.source === source && status.rows === rows) return;
  status.source = source;
  status.rows = rows;
  publish();
}

export function reportWatch(table: ContentTable, watch: Watch): void {
  const status = entry(table);
  if (status.watch === watch) return;
  status.watch = watch;
  publish();
}

export function reportChange(table: ContentTable): void {
  entry(table).changedAt = Date.now();
  publish();
}

export function statusSnapshot(): TableStatus[] {
  return snapshot;
}

export function subscribeStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
