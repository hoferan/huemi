import { use, useEffect, useRef, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Share2 } from 'lucide-react';
import { SLOTS } from '../../model/types';
import { useSession } from '../../session/useSession';
import { headerButton } from '../../ui/headerButton';
import { IMAGE_HEIGHT, IMAGE_WIDTH, layoutShareImage, type ShareImageInput } from './layout';
import { ShareContext } from './ShareContext';
import { shareOutfit, type ShareOutcome } from './shareOutfit';
import { shareText } from './shareText';

/** An image being made for one outfit, and the image once it is there. */
type Rendering = { promise: Promise<File | null>; done: boolean; file: File | null };

const MESSAGES: Readonly<Record<ShareOutcome, string | null>> = {
  shared: null,
  dismissed: null,
  downloaded: 'Image saved',
  failed: "Couldn't share this outfit.",
};

/**
 * Shares the outfit as a picture, through the system share sheet.
 *
 * The picture is made ahead of the tap, every time the outfit changes. Safari
 * refuses `navigator.share` once the tap's user activation has gone through
 * an await, and painting and encoding a PNG is one, so a share started after
 * it would fail on an iPhone. A tap that beats the picture waits for it and
 * takes its chances.
 *
 * A tap while a share is open is ignored: Chrome rejects a second share
 * while the sheet is up, and the user would see that as a failure. The guard
 * is a ref, for the reason `SaveToggle` gives.
 */
export function ShareButton({ pieces, baseSlot }: ShareImageInput) {
  const port = use(ShareContext);
  const { dispatch } = useSession();
  const rendering = useRef<Rendering | null>(null);
  const inFlight = useRef(false);

  // Held until the pieces change, not merely their object: the suggestions
  // screen builds a new one on every render, and each would paint again.
  const key = `${SLOTS.map((slot) => pieces[slot] ?? '').join()}|${baseSlot ?? ''}`;
  const [input, setInput] = useState({ key, value: { pieces, baseSlot } });
  if (input.key !== key) setInput({ key, value: { pieces, baseSlot } });

  useEffect(() => {
    const next: Rendering = { promise: Promise.resolve(null), done: false, file: null };
    next.promise = port
      .render(layoutShareImage(input.value), IMAGE_WIDTH, IMAGE_HEIGHT)
      .catch(() => null)
      .then((file) => {
        next.file = file;
        next.done = true;
        return file;
      });
    rendering.current = next;
  }, [port, input]);

  function share() {
    const current = rendering.current;
    if (inFlight.current || !current) return;
    inFlight.current = true;
    const text = shareText(input.value.pieces);
    const start = (file: File | null): Promise<ShareOutcome> =>
      file ? shareOutfit(port, file, text) : Promise.resolve('failed');
    const outcome = current.done ? start(current.file) : current.promise.then(start);
    void outcome
      .then((result) => {
        const message = MESSAGES[result];
        if (message) dispatch({ type: 'toastShown', message });
      })
      .finally(() => {
        inFlight.current = false;
      });
  }

  return (
    <button
      type="button"
      aria-label="Share outfit"
      onClick={share}
      {...stylex.props(headerButton.button)}
    >
      <Share2 size={22} aria-hidden="true" />
    </button>
  );
}
