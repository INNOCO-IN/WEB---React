import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Nav from '../components/Nav';
import { isSupabaseConfigured } from '../lib/supabase';
import { useSession } from '../lib/auth';
import '../review/review.css';
import Add from '../review/Add';
import Desk from '../review/Desk';
import Publish from '../review/Publish';
import SignIn from '../review/SignIn';
import StoryView from '../review/StoryView';
import { NoKeys } from '../review/States';

/**
 * The review desk: what visitors sent, and how it moves.
 *
 * Deliberately not a page of the site. It has no nav, no footer, no locale and
 * no entry in the route table — it is reached by typing `/review`, it is
 * `noindex`, and nothing links to it. The public pages are generated from
 * `site/`; this one is hand-written, because it is a tool rather than a page.
 *
 * It reads the three intake tables, moves a row's status, and — since the 2026
 * design bundle — publishes a story to the site from the browser rather than
 * from a terminal. `stories` and `story_entries` are still different tables and
 * the gap between them is still editorial: a permalink, a headline, a topic and
 * a summary the form never asked for. The publishing flow is where a person
 * writes those. `scripts/promote-story.mjs` remains for anyone who would rather
 * read the SQL first, and both derive the row the same way — see
 * `lib/story-promotion.ts`.
 *
 * Everything here is gated by RLS, not by this file. A stranger who signs in
 * sees an empty desk because the database says so, which is why the empty case
 * is spelled out rather than left to look like a slow network.
 *
 * The screens live in `src/review/`, which is a module rather than a page for
 * the same reason `src/builder/` is: it has its own palette, its own states and
 * its own routes, and none of them belong to the site.
 */

export default function Review() {
  // A staff tool has no business in an index, and the site's own head sync does
  // not run here — this page is outside the generated route table.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const previous = document.title;
    document.title = 'Review desk — IN';
    return () => {
      meta.remove();
      document.title = previous;
    };
  }, []);

  return (
    <>
      {/*
        The site's own header, carried onto the desk.

        The design bundle says not to: "there is no product navigation — nothing
        links into the desk and nothing links out of it, by design." That is a
        defensible position for a tool somebody sits down at for twenty minutes,
        and IN has asked for the way out anyway, which is their call to make.

        Rendered outside `.rv`, and that placement is the whole trick. The desk
        scopes its palette and its serif to that class — its ink is #1A1613
        against the site's #2E3B40 — so a nav nested inside would inherit a
        typeface and a set of hairlines that are not its own. Out here it is the
        same component the public pages mount, unaltered.
      */}
      <Nav />
      <div className="rv">
        <Screens />
      </div>
    </>
  );
}

function Screens() {
  const { session, loading } = useSession();

  if (!isSupabaseConfigured) {
    return (
      <div className="rv-page rv-page--narrow">
        <NoKeys />
      </div>
    );
  }

  // Nothing at all until the first answer, so the desk does not flash a
  // sign-in form at somebody who is already signed in.
  if (loading) return <div style={{ minHeight: '100vh' }} />;
  if (!session) return <SignIn />;

  const email = session.user.email ?? '';

  return (
    <Routes>
      <Route index element={<Desk email={email} />} />
      <Route path="story/:id" element={<StoryView />} />
      <Route path="publish/:id" element={<Publish />} />
      {/* The other door into the collection: a story nobody sent. It takes the
          address because every row it writes is stamped with who wrote it. */}
      <Route path="add" element={<Add email={email} />} />
      {/* A deep link into a screen that no longer exists lands on the desk
          rather than on the site's 404, which has a nav and a footer on it. */}
      <Route path="*" element={<Navigate to="/review" replace />} />
    </Routes>
  );
}
