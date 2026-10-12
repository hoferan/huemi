import { Redirect } from '../../ui/Redirect';
import { useEffect, useMemo, useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Shuffle as ShuffleIcon } from 'lucide-react';
import { suggest } from '../../color/engine';
import { colorName } from '../../color/palette';
import { SLOTS, SLOT_LABELS, type Slot } from '../../model/types';
import { advance, composeOutfit, positionLabel } from '../../session/select';
import type { SlotPick } from '../../session/types';
import { useSession } from '../../session/useSession';
import { durations, tokens } from '../../styles/tokens.stylex';
import { BaseBlock } from '../../ui/BaseBlock';
import { DevSlot } from '../../ui/DevSlot';
import { Screen } from '../../ui/Screen';
import { PICKER_TITLE } from '../pick/copy';
import { outfitPieces } from '../saved/buildOutfit';
import { ShareButton } from '../share/ShareButton';
import { Sheet } from '../../ui/Sheet';
import { SuggestionBlock } from '../../ui/SuggestionBlock';
import { useAnnounce } from '../../ui/useAnnounce';
import { Alternatives } from './Alternatives';
import { PIECES } from './copy';
import { PiecesSheet } from './PiecesSheet';
import { SaveToggle } from './SaveToggle';
import { useBaseParam } from './useBaseParam';
import { clearOfToasts } from '../../ui/toastClearance';
import { FULL_SHAPE, isWorn, shapeFor, wornSlots, type OptionalSlot } from '../../model/shape';
import { localPieces } from '../../storage/localPieces';

// The crossfade is CSS and the flag that triggers it is a timer, so one of the
// two has to be a number. It is derived rather than restated: `durations` is a
// `defineConsts` literal, so this is the same value `tokens.shuffle` carries
// and a change to it cannot leave the timer behind. The format is held by
// `tokens.stylex.test.ts`, which is what keeps the parse honest.
const SHUFFLE_MS = Number.parseInt(durations.shuffle, 10);

const styles = stylex.create({
  header: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  // Positioned, so the `suggest.overlay` slot can cover the blocks, and
  // isolated, so the panel's z-index stays inside this box. Without that the
  // panel paints over the sticky footer once the page scrolls, and Shuffle
  // disappears under it.
  blocks: {
    position: 'relative',
    isolation: 'isolate',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flexGrow: 1,
  },
  // The base is the ground every suggestion is made against, so it reads
  // larger. The proportion is the prototype's.
  base: { flexGrow: 1.6 },
  // Sticky, never fixed. Shuffle is the screen's main action and at 200% text
  // the blocks push it past the fold, so it has to stay on screen — but a
  // sticky element keeps its space in the flow, so scrolling to the end puts
  // the last block above it rather than underneath. A fixed footer would
  // cover that block, which is exactly what the reachability check in
  // e2e/invariants.spec.ts exists to catch.
  footer: {
    position: 'sticky',
    bottom: 0,
    display: 'flex',
    // The hint, Pieces and Shuffle fit one line on a phone at default text. At
    // large text on a narrow one they do not, and wrapping drops the buttons
    // under the hint rather than off the right edge of the screen.
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '10px',
    paddingBlock: '8px',
    backgroundColor: tokens.bg,
  },
  hint: { margin: 0, flex: '1 1 5rem', fontSize: '0.875rem', color: tokens.ink2 },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: '10px',
    marginInlineStart: 'auto',
  },
  pill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: tokens.touchTarget,
    paddingInline: '16px',
    borderRadius: '999px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    backgroundColor: { default: 'transparent', ':hover': tokens.surface },
    color: tokens.ink,
    font: 'inherit',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  },
});

/**
 * The core screen: a locked base colour, a suggested colour for every other
 * slot, and the two ways to move a suggestion — the block's own controls and
 * the alternatives sheet.
 *
 * The URL is the authority for the base, not the session. A deep link, a
 * refresh and a back navigation all arrive the same way, and reconciling
 * towards the parameters means there is no second source of truth to keep in
 * step. The session still holds the picks, because they are not in the URL.
 */
export function Suggestions() {
  const base = useBaseParam();
  const { state, dispatch } = useSession();

  // Read during the first render, so the first outfit drawn already leaves out
  // what the person left out last time. Only this screen's sheet changes it.
  const [preference, setPreference] = useState(() => localPieces.read());

  // Two separate questions, and conflating them is what left this screen
  // empty. The picker dispatches `baseChosen` and then navigates, and
  // `baseChosen` resets the picks and the shape, so the session arrives here
  // already agreeing with the URL and holding nothing. Asking only whether the
  // base agrees read that as settled, skipped the seed, and rendered one block.
  //
  // The shape is what stops the seed running on every mount. It is set only
  // when an outfit is seeded or loaded, so a user who advanced a slot and came
  // back from a later screen finds their choices, and a reopened saved outfit
  // stays as it was saved, not a fresh outfit over the top of either.
  const baseMatches =
    base !== null && state.base?.slot === base.slot && state.base.hex === base.hex;
  const ready = baseMatches && state.shape !== null;
  const fresh = useMemo(
    () => (base ? shapeFor(base.slot, preference) : FULL_SHAPE),
    [base, preference],
  );
  const shape = ready && state.shape ? state.shape : fresh;

  // Computed during render as well as dispatched from the effect, because the
  // first paint happens before the effect runs and the blocks need colours
  // then. Safe only because the seed is deterministic: this is the same outfit
  // the dispatch below is about to put in the session, not a placeholder.
  const seed = useMemo(() => (base ? composeOutfit(base, {}, () => 0, fresh) : {}), [base, fresh]);
  const picks = ready ? state.picks : seed;

  useEffect(() => {
    if (!base) return;
    if (!baseMatches) dispatch({ type: 'baseChosen', slot: base.slot, hex: base.hex });
    if (!ready) dispatch({ type: 'outfitSeeded', shape: fresh, picks: seed });
  }, [base, baseMatches, ready, fresh, seed, dispatch]);

  const announce = useAnnounce();
  // Set for one shuffle's worth of time so the blocks crossfade together at
  // the shuffle duration rather than the single-block one.
  const [shuffling, setShuffling] = useState(false);
  const [openFor, setOpenFor] = useState<Slot | null>(null);
  const [piecesOpen, setPiecesOpen] = useState(false);

  // A base that cannot be rebuilt from the URL cannot be told apart from never
  // having picked one, so there is no error state to render (ADR 0011).
  if (!base) return <Redirect to="/" />;

  function move(slot: Slot, delta: 1 | -1) {
    if (!base) return;
    const pick = picks[slot];
    if (!pick) return;
    const next = advance(base, slot, pick.cursor ?? 0, delta);
    dispatch({ type: 'pickChanged', slot, hex: next.hex, cursor: next.cursor });

    // Next keeps focus and keeps its name, and a swipe moves focus nowhere,
    // so the block's new colour has no other way to a screen reader. The
    // words are the field's own name without its "other options".
    announce(
      [SLOT_LABELS[slot], colorName(next.hex), positionLabel(next.cursor, next.count)].join(', '),
    );
  }

  function shuffle() {
    if (!base) return;
    const fixed: Partial<Record<Slot, SlotPick>> = {};
    for (const slot of SLOTS) {
      const pick = picks[slot];
      if (pick && state.locked[slot]) fixed[slot] = pick;
    }

    const free = wornSlots(shape).filter((slot) => slot !== base.slot && !state.locked[slot]);
    if (free.length === 0) {
      announce('Nothing to shuffle — every piece is kept.');
      return;
    }

    const next = composeOutfit(base, fixed, Math.random, shape);
    dispatch({ type: 'picksReplaced', picks: next });
    setShuffling(true);
    // Cleared on a timer rather than a transitionend, which does not fire when
    // a colour happens to come back the same. Under reduced motion the CSS
    // duration is already zero, so a late clear changes nothing.
    setTimeout(() => setShuffling(false), SHUFFLE_MS);

    // Four blocks change and focus moves nowhere, so the live region is the
    // only thing that tells a screen reader anything. It names the colours
    // rather than saying "Shuffled", so an outfit that came back the same
    // reads as the same.
    announce(free.map((slot) => `${SLOT_LABELS[slot]} ${colorName(next[slot]!.hex)}`).join(', '));
  }

  // A piece switched off goes and the rest stay exactly as they are; one
  // switched on is filled with everything on screen held, so the outfit the
  // person was looking at survives either way. Only the switched piece is
  // remembered, so a base that forces a piece on never reaches storage.
  function changeWorn(slot: OptionalSlot, worn: boolean) {
    if (!base) return;
    const next = { ...shape, [slot]: worn };
    const added: Partial<Record<Slot, SlotPick>> = {};
    if (worn) {
      const held: Partial<Record<Slot, SlotPick>> = {};
      for (const other of wornSlots(shape)) {
        const pick = picks[other];
        if (pick && other !== base.slot) held[other] = pick;
      }
      const filled = composeOutfit(base, held, () => 0, next)[slot];
      if (filled) added[slot] = filled;
    }
    dispatch({ type: 'shapeChanged', shape: next, picks: added });
    const remembered = { ...preference, [slot]: worn };
    localPieces.write(remembered);
    setPreference(remembered);
  }

  const anyKept = SLOTS.some((slot) => state.locked[slot]);

  return (
    <Screen
      title="Goes with it"
      back={{ to: `/color?slot=${base.slot}`, title: PICKER_TITLE }}
      header={
        <div {...stylex.props(styles.header)}>
          <ShareButton pieces={outfitPieces(base, picks)} baseSlot={base.slot} />
          <SaveToggle base={base} picks={picks} />
        </div>
      }
    >
      <div {...stylex.props(styles.blocks)}>
        {SLOTS.map((slot) => {
          const pick = picks[slot];
          if (slot === base.slot) {
            return (
              <BaseBlock
                key={slot}
                slot={slot}
                hex={base.hex}
                style={styles.base}
                fade={shuffling ? tokens.shuffle : tokens.colorFade}
              />
            );
          }
          if (!pick || !isWorn(shape, slot)) return null;
          const count = advance(base, slot, pick.cursor ?? 0, 0).count;
          return (
            <SuggestionBlock
              key={slot}
              slot={slot}
              hex={pick.hex}
              position={pick.cursor === undefined ? null : positionLabel(pick.cursor, count)}
              kept={state.locked[slot] === true}
              fade={shuffling ? tokens.shuffle : tokens.colorFade}
              onNext={() => move(slot, 1)}
              onPrevious={() => move(slot, -1)}
              onKeepToggle={() => dispatch({ type: 'lockToggled', slot })}
              onOpenAlternatives={() => setOpenFor(slot)}
            />
          );
        })}
        <DevSlot
          name="suggest.overlay"
          context={{ baseSlot: base.slot, pieces: outfitPieces(base, picks) }}
        />
      </div>
      <div {...clearOfToasts} {...stylex.props(styles.footer)}>
        <p {...stylex.props(styles.hint)}>
          {anyKept
            ? 'Kept pieces stay when you shuffle.'
            : 'Swipe a block, or hold one to keep it.'}
        </p>
        <div {...stylex.props(styles.actions)}>
          <button type="button" onClick={() => setPiecesOpen(true)} {...stylex.props(styles.pill)}>
            {PIECES}
          </button>
          <button type="button" onClick={shuffle} {...stylex.props(styles.pill)}>
            <ShuffleIcon size={16} aria-hidden="true" />
            {anyKept ? 'Shuffle the rest' : 'Shuffle'}
          </button>
        </div>
      </div>
      {piecesOpen && (
        <PiecesSheet
          open
          onOpenChange={(next) => !next && setPiecesOpen(false)}
          shape={shape}
          baseSlot={base.slot}
          onWornChange={changeWorn}
        />
      )}
      {openFor !== null && picks[openFor] && (
        <Sheet
          open
          onOpenChange={(next) => !next && setOpenFor(null)}
          title={`Other options for ${SLOT_LABELS[openFor]}`}
        >
          <Alternatives
            options={suggest(base.hex, openFor, base.slot)}
            current={picks[openFor].hex}
            onChoose={(hex, cursor) => {
              // The reducer drops a pickChanged for a locked slot, so a
              // deliberate choice on a kept block would silently do nothing.
              // Releasing first makes the choice land and makes the release
              // visible on the block.
              if (state.locked[openFor]) dispatch({ type: 'lockToggled', slot: openFor });
              dispatch({ type: 'pickChanged', slot: openFor, hex, cursor });
              setOpenFor(null);
            }}
          />
        </Sheet>
      )}
    </Screen>
  );
}
