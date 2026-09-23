import { useState } from 'react';
import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import type { Outfit } from '../../model/types';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { openOutfit } from './openOutfit';
import { SavedCard } from './SavedCard';
import { useOutfits } from './useOutfits';

const styles = stylex.create({
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
});

function unreadableNote(count: number): string {
  return count === 1
    ? "1 saved outfit couldn't be read and isn't shown."
    : `${count} saved outfits couldn't be read and aren't shown.`;
}

/**
 * The saved collection. Newest first, open or delete, and nothing else yet:
 * renaming, notes and duplicating wait until there is a collection to manage
 * (#18).
 *
 * A read that failed is an error, not an empty list, because "nothing saved
 * yet" would be false. Entries that could not be read are counted and said,
 * for the same reason.
 */
export function Saved() {
  const outfits = useOutfits();
  const { dispatch } = useSession();
  const navigate = useNavigate();
  // Read once per visit rather than during every render, which the React
  // Compiler lint rules treat as impure. "Today" is judged against the moment
  // the screen opened.
  const [now] = useState(() => new Date());

  function open(outfit: Outfit) {
    const { base, picks } = openOutfit(outfit);
    dispatch({ type: 'outfitLoaded', base, picks });
    void navigate(`/suggest?slot=${base.slot}&hex=${encodeURIComponent(base.hex)}`);
  }

  async function remove(outfit: Outfit) {
    const ok = await outfits.remove([outfit.id]);
    dispatch(
      ok
        ? {
            type: 'toastShown',
            message: `Deleted ${outfit.name}`,
            action: { label: 'Undo', kind: 'undoDelete', outfits: [outfit] },
            // The Delete button that had focus is gone with its card.
            focusAction: true,
          }
        : { type: 'toastShown', message: "Couldn't delete this outfit." },
    );
  }

  const { state } = outfits;

  return (
    <Screen title="Saved outfits">
      {state.status === 'error' && (
        <>
          <p {...stylex.props(styles.text)}>
            Couldn&apos;t read your saved outfits on this device.
          </p>
          <Button label="Try again" onClick={() => void outfits.reload()} />
        </>
      )}
      {state.status === 'ready' && (
        <>
          {state.unreadable > 0 && (
            <p {...stylex.props(styles.text)}>{unreadableNote(state.unreadable)}</p>
          )}
          {state.outfits.length === 0 && state.unreadable === 0 && (
            <p {...stylex.props(styles.text)}>
              Nothing saved yet. Save an outfit from the suggestions screen.
            </p>
          )}
          {state.outfits.length > 0 && (
            <ul {...stylex.props(styles.list)}>
              {state.outfits.map((outfit) => (
                <SavedCard
                  key={outfit.id}
                  outfit={outfit}
                  now={now}
                  onOpen={() => open(outfit)}
                  onDelete={() => void remove(outfit)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </Screen>
  );
}
