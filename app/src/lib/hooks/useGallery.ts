import { useCallback, useEffect, useState } from 'react';
import { GALLERIES, type GalleryPhoto } from '../content/galleries';

/**
 * The project pages' photo lightbox.
 *
 * Five pages shipped a copy of this logic each. It is one hook now, taking
 * only the page's photo list — and it gains keyboard control on the way, which
 * none of the copies had: a thumbnail strip you can tab into but not arrow
 * through is a keyboard trap in slow motion.
 */

export interface GalleryThumb {
  src: string;
  alt: string;
  open: () => void;
  selected: boolean;
  style: string;
}

export interface Gallery {
  ready: boolean;
  /** Thumbnail strip, in page order. */
  gallery: GalleryThumb[];
  /** Current photo. */
  photo: GalleryPhoto | undefined;
  lbSrc: string;
  lbCap: string;
  lbImgStyle: string;
  lbCount: string;
  prevLb: () => void;
  nextLb: () => void;
}

/**
 * The thumbnail's frame. The picture inside it is an `<img>`.
 *
 * It used to be this element's `background-image`, which is the wrong element
 * for a photograph: a background cannot be lazy-loaded, cannot carry alt text
 * of its own, does not print, and cannot be saved or zoomed. The `<img>` in
 * the markup fills this box with `object-fit: cover`.
 */
const THUMB =
  'flex: 0 0 auto; width: 96px; height: 54px; padding: 0; border: none; ' +
  'overflow: hidden; cursor: pointer; background-color: #F3EAD0;';

export function useGallery(page: keyof typeof GALLERIES | string): Gallery {
  const photos = GALLERIES[page] ?? [];
  const [index, setIndex] = useState(0);

  const count = photos.length;
  const prevLb = useCallback(() => setIndex((i) => (i + count - 1) % count), [count]);
  const nextLb = useCallback(() => setIndex((i) => (i + 1) % count), [count]);

  useEffect(() => {
    if (count < 2) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft') prevLb();
      else if (event.key === 'ArrowRight') nextLb();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [count, prevLb, nextLb]);

  const current = photos[index];

  return {
    ready: count > 0,
    gallery: photos.map((photo, i) => ({
      src: photo.src,
      alt: photo.alt,
      selected: i === index,
      open: () => setIndex(i),
      style:
        `${THUMB} opacity: ${i === index ? '1' : '0.55'}; ` +
        `outline: ${i === index ? '2.5px solid #1E5A64' : 'none'}; outline-offset: -2.5px;`,
    })),
    photo: current,
    lbSrc: current?.src ?? '',
    lbCap: current?.alt ?? '',
    // The `<img>`'s own box, filling the viewer. `lbSrc` is the picture.
    lbImgStyle: current
      ? 'position: absolute; inset: 0; width: 100%; height: 100%; ' +
        `object-fit: cover; object-position: ${current.position ?? 'center'};`
      : '',
    lbCount: count ? `${index + 1} / ${count}` : '',
    prevLb,
    nextLb,
  };
}
