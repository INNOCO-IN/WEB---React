#!/usr/bin/env node
/**
 * Converts a legacy page into a builder page.
 *
 * The legacy pages are React components generated from `site/*.dc.html`, so
 * there is no data file to transform — the structure has to be stated once, by
 * hand, against the component it replaces. What this script does is turn that
 * statement into the storage format: it generates the stable element ids,
 * splits every value into the shared tree or a per-locale content record
 * according to the element registry's rules, and writes the JSON.
 *
 * It is re-runnable and id-stable. Ids are derived from the page's routeKey
 * and the element's position-independent key in the spec, so re-running after
 * an edit keeps every translation attached to the element it was written for.
 *
 * Nothing is deleted. The legacy component and its route stay exactly where
 * they are; a page is served by the builder only once its routeKey is listed
 * in `src/builder/routes.ts`. That is the reverse path — remove the entry.
 *
 *   node scripts/migrate-builder-page.mjs            # write every spec
 *   node scripts/migrate-builder-page.mjs news       # just this one
 *   node scripts/migrate-builder-page.mjs --check    # fail if output is stale
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'src', 'builder', 'pages');
const SPECS = join(HERE, 'builder-specs');

/**
 * `news` + `hero.title` → `news:hero.title`.
 *
 * Readable on purpose: an id shows up in a database row, a layout override and
 * a bug report, and `news:cta.heading` says what it is where a uuid would not.
 * It is derived from the spec key, never from the text — a heading that gets
 * reworded must not lose its translations.
 */
function elementId(routeKey, key) {
  return `${routeKey}:${key}`;
}

/**
 * One spec node becomes one BuilderNode plus a slice of each locale's content.
 *
 * `text`, `label` and `alt` in a spec node are written as `{ en, ko, 'zh-TW' }`
 * maps. This is what pulls them out of the tree: the tree keeps a binding, and
 * the words go to the locale records.
 */
function convertNode(routeKey, spec, locales, content) {
  const id = elementId(routeKey, spec.key);
  const node = { id, type: spec.type, props: { ...(spec.props ?? {}) } };

  for (const [field, value] of Object.entries(spec.localized ?? {})) {
    const bindingKey = `${spec.key}.${field}`;
    node.bindings = { ...node.bindings, [field]: bindingKey };
    for (const locale of locales) {
      const text = value?.[locale];
      // An absent translation is left absent. Writing the English string into
      // the Korean record would mark it translated when nobody has translated
      // it, which is the one thing this migration must not do.
      if (typeof text === 'string' && text.trim()) content[locale][bindingKey] = text;
    }
  }

  if (spec.children?.length) {
    node.children = spec.children.map((child) => convertNode(routeKey, child, locales, content));
  }
  return node;
}

export function convertSpec(spec) {
  const locales = Object.keys(spec.locales);
  const content = Object.fromEntries(locales.map((locale) => [locale, {}]));

  const nodes = spec.nodes.map((node) => convertNode(spec.routeKey, node, locales, content));

  const pageLocales = {};
  for (const locale of locales) {
    const meta = spec.locales[locale];
    pageLocales[locale] = {
      slug: meta.slug,
      status: meta.status ?? 'draft',
      seo: {
        title: meta.seo?.title ?? '',
        description: meta.seo?.description ?? '',
        ...(meta.seo?.openGraphImage ? { openGraphImage: meta.seo.openGraphImage } : {}),
      },
      content: content[locale],
    };
  }

  return {
    id: spec.id,
    routeKey: spec.routeKey,
    defaultLocale: spec.defaultLocale ?? 'en',
    sharedDocument: { nodes },
    locales: pageLocales,
  };
}

/* ------------------------------------------------------------------- run */

const args = process.argv.slice(2);
const check = args.includes('--check');
const only = args.filter((a) => !a.startsWith('--'));

const specFiles = JSON.parse(readFileSync(join(SPECS, 'index.json'), 'utf8'));
const wanted = only.length ? specFiles.filter((f) => only.includes(f)) : specFiles;

if (!wanted.length) {
  console.error(`No spec named ${only.join(', ')}. Known: ${specFiles.join(', ')}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

let stale = 0;
for (const name of wanted) {
  const spec = JSON.parse(readFileSync(join(SPECS, `${name}.json`), 'utf8'));
  const page = convertSpec(spec);
  const json = `${JSON.stringify(page, null, 2)}\n`;
  const target = join(OUT, `${name}.json`);

  const current = existsSync(target) ? readFileSync(target, 'utf8') : null;
  if (current === json) {
    console.log(`  = ${name}.json unchanged`);
    continue;
  }
  if (check) {
    stale += 1;
    console.log(`  ! ${name}.json is out of date`);
    continue;
  }
  writeFileSync(target, json);
  const counts = Object.entries(page.locales)
    .map(([locale, data]) => `${locale}:${Object.keys(data.content).length}`)
    .join(' ');
  console.log(`  → ${name}.json  ${page.sharedDocument.nodes.length} top-level nodes, content ${counts}`);
}

if (check && stale) {
  console.log('\nRun: node scripts/migrate-builder-page.mjs');
  process.exit(1);
}
