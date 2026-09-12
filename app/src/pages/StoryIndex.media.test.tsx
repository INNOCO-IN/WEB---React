import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import i18next from '../i18n';

/**
 * An attachment that is not a picture.
 *
 * The submission form has always accepted four kinds — image, video, audio and
 * PDF — and the reading pane only ever drew an `<img>`. A submitted PDF went
 * into `story_entries.image` and rendered as an empty frame: no error, no
 * console line, just a story with a hole in it. These are the four branches
 * that replaced it, one test each, because the failure is invisible and a
 * screenshot is the only other thing that would have caught it.
 *
 * The bundled copy is the fixture. `STORY_ENTRIES` is what the index renders
 * with no database configured, which is exactly the state the suite runs in.
 */

const attachment = vi.hoisted(() => ({ url: '' }));

vi.mock('../lib/content/stories', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/content/stories')>();
  return {
    ...actual,
    get STORY_ENTRIES() {
      return [{ ...actual.STORY_ENTRIES[0], id: 'attachment-test', image: attachment.url }];
    },
  };
});

async function readingPane(url: string) {
  attachment.url = url;
  await i18next.changeLanguage('en');
  const { container } = render(
    <MemoryRouter initialEntries={['/story/all?story=attachment-test']}>
      <App />
    </MemoryRouter>,
  );
  await screen.findByRole('banner');
  return container;
}

describe('a story carries whatever the submitter attached', () => {
  it('draws a picture as an image', async () => {
    const container = await readingPane('http://localhost/story-media/a.png');

    expect(container.querySelector('img[src="http://localhost/story-media/a.png"]')).toBeInTheDocument();
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('draws a video in a player rather than an image', async () => {
    const container = await readingPane('http://localhost/story-media/a.mp4');

    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', 'http://localhost/story-media/a.mp4');
    expect(video).toHaveAttribute('controls');
    expect(container.querySelector('img[src*="story-media"]')).not.toBeInTheDocument();
  });

  it('draws a recording as an audio player', async () => {
    const container = await readingPane('http://localhost/story-media/a.mp3');

    const audio = container.querySelector('audio');
    expect(audio).toHaveAttribute('src', 'http://localhost/story-media/a.mp3');
    expect(audio).toHaveAttribute('controls');
  });

  it('frames a PDF and offers a way out to it', async () => {
    const container = await readingPane('http://localhost/story-media/a.pdf');

    expect(container.querySelector('iframe')).toHaveAttribute('src', 'http://localhost/story-media/a.pdf');
    // The frame can fail — a browser that will not render a PDF inline shows
    // nothing at all — so the link is not decoration.
    expect(screen.getByRole('link', { name: 'Open the file' })).toHaveAttribute(
      'href',
      'http://localhost/story-media/a.pdf',
    );
    expect(container.querySelector('img[src*="story-media"]')).not.toBeInTheDocument();
  });

  it('leaves the frame out when there is no attachment at all', async () => {
    const container = await readingPane('');

    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(container.querySelector('img[src*="story-media"]')).not.toBeInTheDocument();
  });
});
