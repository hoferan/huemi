import type { ReactElement } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Share2 } from 'lucide-react';
import { headerButton } from '../../ui/headerButton';
import type { ShareImage } from './layout';
import { useShareOutfit } from './useShareOutfit';

/**
 * Share in a screen's header, for the one outfit the screen shows. The
 * picture is painted as soon as the outfit is there (`useShareOutfit`).
 */
export function ShareButton(image: ShareImage): ReactElement {
  const { share } = useShareOutfit(image, 'now');
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
