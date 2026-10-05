import { useRef, type ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { SLOT_AREA, SLOTS, type Slot } from '../../model/types';
import type { Base, SlotPick } from '../../session/types';
import { useSession } from '../../session/useSession';
import { BaseBlock } from '../../ui/BaseBlock';
import { Button } from '../../ui/Button';
import { HOME } from '../../ui/home';
import { PlainBlock } from '../../ui/PlainBlock';
import { Redirect } from '../../ui/Redirect';
import { Screen } from '../../ui/Screen';
import { clearOfToasts } from '../../ui/toastClearance';
import { makeOutfitId } from '../saved/makeOutfitId';
import { sameOutfit } from '../saved/matching';
import { outfitName } from '../saved/outfitName';
import { useOutfits } from '../saved/useOutfits';
import type { ShareImageInput } from '../share/layout';
import { parseShareLink } from '../share/link';
import { SHARED_TITLE } from './copy';

const styles = stylex.create({
  blocks: { display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1 },
  // As on the suggestions screen, the base reads larger.
  base: { flexGrow: 1.6 },
  actions: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
});

/**
 * The piece the outfit is saved around. A link from a check has no base, so
 * the piece that covers the most of the outfit stands in for one, the
 * weighting the engine and the check use.
 */
function baseOf({ pieces, baseSlot }: ShareImageInput): Base {
  const present = SLOTS.filter((slot) => pieces[slot] !== undefined);
  const slot =
    baseSlot ??
    present.reduce((largest, next) => (SLOT_AREA[next] > SLOT_AREA[largest] ? next : largest));
  return { slot, hex: pieces[slot]! };
}

/** The pieces other than the base, in the shape `sameOutfit` compares against. */
function picksOf({ pieces }: ShareImageInput, base: Base): Partial<Record<Slot, SlotPick>> {
  const picks: Partial<Record<Slot, SlotPick>> = {};
  for (const slot of SLOTS) {
    const hex = pieces[slot];
    if (hex && slot !== base.slot) picks[slot] = { hex };
  }
  return picks;
}

/**
 * Where a shared link lands: the outfit exactly as it was sent, a way to keep
 * it and a way into the app.
 *
 * Whoever opens it has none of the sender's context. An editing screen would
 * change the outfit under them, and its back arrow would point at a picker
 * they never saw, so this one only shows (PO, 2026-10-05, from mocks).
 *
 * "Saved" comes from the saved list, not from this visit, so opening the
 * same link twice cannot save the outfit twice. A press is ignored while the
 * previous one is still writing, for the reason `SaveToggle` gives.
 */
export function Shared(): ReactElement {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const outfits = useOutfits();
  const { dispatch } = useSession();
  const inFlight = useRef(false);

  const shared = parseShareLink(params);
  if (!shared) return <Redirect to="/" />;

  const { pieces } = shared;
  const base = baseOf(shared);
  const picks = picksOf(shared, base);
  const saved =
    outfits.state.status === 'ready' &&
    outfits.state.outfits.some((outfit) => sameOutfit(outfit, base, picks));

  async function save() {
    if (saved || inFlight.current) return;
    inFlight.current = true;
    try {
      const ok = await outfits.save({
        version: 1,
        id: makeOutfitId(),
        name: outfitName(base),
        createdAt: new Date().toISOString(),
        baseSlot: base.slot,
        pieces,
      });
      dispatch({
        type: 'toastShown',
        message: ok ? 'Saved' : "Couldn't save this outfit on this device.",
      });
    } finally {
      inFlight.current = false;
    }
  }

  return (
    <Screen title={SHARED_TITLE} back={HOME}>
      <div {...stylex.props(styles.blocks)}>
        {SLOTS.map((slot) => {
          const hex = shared.pieces[slot];
          if (!hex) return null;
          return slot === shared.baseSlot ? (
            <BaseBlock key={slot} slot={slot} hex={hex} style={styles.base} />
          ) : (
            <PlainBlock key={slot} slot={slot} hex={hex} />
          );
        })}
      </div>
      <div {...clearOfToasts} {...stylex.props(styles.actions)}>
        <Button label={saved ? 'Saved' : 'Save this outfit'} onClick={() => void save()} />
        <Button
          variant="secondary"
          label="Try your own colors"
          onClick={() => void navigate('/')}
        />
      </div>
    </Screen>
  );
}
