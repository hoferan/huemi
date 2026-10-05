import { use, useEffect, useRef, useState } from 'react';
import { SLOTS } from '../../model/types';
import { useSession } from '../../session/useSession';
import { IMAGE_HEIGHT, IMAGE_WIDTH, layoutShareImage, type ShareImage } from './layout';
import { shareLink } from './link';
import type { SharePort } from './port';
import { ShareContext } from './ShareContext';
import { shareOutfit, type ShareOutcome } from './shareOutfit';
import { shareText } from './shareText';

// `this: void` for the reason OutfitsValue gives: callers destructure it.
export type ShareActions = { share(this: void): void; prepare(this: void): void };

/** An image being made for one outfit, and the image once it is there. */
type Rendering = { key: string; promise: Promise<File | null>; done: boolean; file: File | null };

const MESSAGES: Readonly<Record<ShareOutcome, string | null>> = {
  shared: null,
  dismissed: null,
  downloaded: 'Image saved',
  downloadedAndCopied: 'Image saved, link copied',
  failed: "Couldn't share this outfit.",
};

function startRendering(port: SharePort, key: string, image: ShareImage): Rendering {
  const rendering: Rendering = { key, promise: Promise.resolve(null), done: false, file: null };
  rendering.promise = port
    .render((measure) => layoutShareImage(image, measure), IMAGE_WIDTH, IMAGE_HEIGHT)
    .catch(() => null)
    .then((file) => {
      rendering.file = file;
      rendering.done = true;
      return file;
    });
  return rendering;
}

/**
 * Shares an outfit as a picture, through the system share sheet.
 *
 * The picture is made ahead of the tap. Safari refuses `navigator.share` once
 * the tap's user activation has gone through an await, and painting and
 * encoding a PNG is one, so a share started after it would fail on an iPhone.
 * A tap that beats the picture waits for it and takes its chances.
 *
 * `now` paints whenever the outfit changes, for a screen that shows one.
 * `onIntent` paints only once `prepare` is called, from a pointer landing on
 * the button or focus reaching it, for a list: painting every saved outfit
 * as the list opens would cost a canvas of about 5.8 MB each.
 *
 * A tap while a share is open is ignored: Chrome rejects a second share
 * while the sheet is up, and the user would see that as a failure. The guard
 * is a ref, for the reason `SaveToggle` gives.
 */
export function useShareOutfit(image: ShareImage, when: 'now' | 'onIntent'): ShareActions {
  const port = use(ShareContext);
  const { dispatch } = useSession();
  const rendering = useRef<Rendering | null>(null);
  const inFlight = useRef(false);

  // Held until the outfit changes, not merely its object: the suggestions
  // screen builds a new one on every render, and each would paint again.
  const { pieces, baseSlot, sentences = [] } = image;
  const key = [
    SLOTS.map((slot) => pieces[slot] ?? '').join(),
    baseSlot ?? '',
    sentences.join('|'),
  ].join('/');
  const [input, setInput] = useState({ key, value: image });
  if (input.key !== key) setInput({ key, value: image });

  useEffect(() => {
    if (when === 'now') rendering.current = startRendering(port, input.key, input.value);
  }, [port, input, when]);

  /** The rendering for the outfit as it is now, started if there is none. */
  function current(): Rendering {
    if (rendering.current?.key !== input.key) {
      rendering.current = startRendering(port, input.key, input.value);
    }
    return rendering.current;
  }

  function share() {
    if (inFlight.current) return;
    inFlight.current = true;
    const pending = current();
    const names = shareText(input.value.pieces);
    const link = shareLink(window.location.origin, input.value);
    // Synchronous, so a ready image keeps the tap's activation. A device that
    // throws instead of answering counts as a failed share; letting the throw
    // escape would leave the guard up and the button dead.
    const start = (file: File | null): Promise<ShareOutcome> => {
      if (!file) return Promise.resolve('failed');
      try {
        return shareOutfit(port, file, names, link);
      } catch {
        return Promise.resolve('failed');
      }
    };
    const outcome = pending.done ? start(pending.file) : pending.promise.then(start);
    void outcome
      .then((result) => {
        const message = MESSAGES[result];
        if (message) dispatch({ type: 'toastShown', message });
      })
      .finally(() => {
        inFlight.current = false;
      });
  }

  return { share, prepare: () => void current() };
}
