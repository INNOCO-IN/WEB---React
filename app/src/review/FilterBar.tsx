import type { ReactNode } from 'react';
import { EDITIONS, EDITION_LABEL } from '../lib/services/review';
import type { DeskCopy } from './copy';
import type { Chip, DeskFilters, Facet } from './filters';
import { Segmented, Select } from './parts';

/**
 * The narrowing controls, and the chips that say which are on.
 *
 * Shared by the two screens that read intake rows: the enquiry and sign-up
 * queues, and the merged story list. It was written inside `Queue` and moved
 * here when the second caller appeared — a second copy of a filter bar is how
 * one queue quietly grows a control the others do not have, and how a chip
 * stops clearing the thing it names.
 *
 * `children` opens the row for a control that belongs to one screen only: the
 * story list puts its own state filter there, inside the same `.rv-filters`
 * row, because two rows of controls would read as two separate ideas.
 */

export function FilterBar({
  filters,
  facets,
  copy,
  update,
  children,
}: {
  filters: DeskFilters;
  facets: Facet[];
  copy: DeskCopy;
  update: (patch: Partial<DeskFilters>) => void;
  children?: ReactNode;
}) {
  return (
    <div className="rv-filters">
      {children}

      {facets.map((facet) => (
        <Select
          key={facet.key}
          label={facet.label}
          any={facet.any}
          value={filters.facet[facet.key] ?? ''}
          options={facet.options}
          onChange={(value) => update({ facet: { ...filters.facet, [facet.key]: value } })}
        />
      ))}

      <Segmented
        label={copy.arrived}
        value={filters.arrived}
        onChange={(arrived) => update({ arrived })}
        options={[
          { value: 'any', label: copy.arrivedAny },
          { value: '30d', label: copy.arrived30 },
          { value: 'year', label: copy.arrivedYear },
          { value: 'range', label: copy.arrivedRange },
        ]}
      />

      {filters.arrived === 'range' ? (
        <>
          <label className="rv-control">
            <span className="rv-label">{copy.from}</span>
            <input
              className="rv-field"
              type="date"
              value={filters.from}
              onChange={(event) => update({ from: event.target.value })}
            />
          </label>
          <label className="rv-control">
            <span className="rv-label">{copy.to}</span>
            <input
              className="rv-field"
              type="date"
              value={filters.to}
              onChange={(event) => update({ to: event.target.value })}
            />
          </label>
        </>
      ) : null}

      {/*
        The reply has to go back in the sender's language — this is for the
        week when the person answering can only write one of them.

        A select rather than a segmented control, so it reads as one of the
        narrowing controls beside it rather than as a mode. The options are
        spelled the way the rail tags each row, and from the same table, so
        picking `KO` here and seeing `KO` on a row are visibly the same fact.
        `EDITIONS` is the site's own list of languages, reordered — so a fourth
        one arrives here without this file being touched.
      */}
      <Select
        label={copy.language}
        any={copy.languageAny}
        value={filters.language === 'any' ? '' : filters.language}
        options={EDITIONS.map((locale) => ({ value: locale, label: EDITION_LABEL[locale] }))}
        onChange={(value) => update({ language: (value || 'any') as DeskFilters['language'] })}
      />

      <Select
        label={copy.order}
        any={copy.newest}
        value={filters.order === 'oldest' ? 'oldest' : ''}
        options={[{ value: 'oldest', label: copy.oldest }]}
        onChange={(value) => update({ order: value === 'oldest' ? 'oldest' : 'newest' })}
      />
    </div>
  );
}

/**
 * Which filters are on, each one removable where it is named.
 *
 * A filter left on quietly is the reason a row goes unread, so the ones that
 * are on are always visible and always removable.
 */
export function Chips({
  chips,
  copy,
  drop,
  clear,
}: {
  chips: Chip[];
  copy: DeskCopy;
  drop: (key: string) => void;
  clear: () => void;
}) {
  if (!chips.length) return null;

  return (
    <div className="rv-chips">
      <span className="rv-label rv-quiet">{copy.narrowedTo}</span>
      {chips.map((chip) => (
        <button key={chip.key} type="button" className="rv-chip" onClick={() => drop(chip.key)}>
          {chip.label} <span aria-hidden="true">✕</span>
        </button>
      ))}
      <button type="button" className="rv-btn-quiet" onClick={clear}>
        {copy.clearAll}
      </button>
    </div>
  );
}
