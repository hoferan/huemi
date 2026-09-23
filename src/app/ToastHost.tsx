import { useEffect, useRef } from 'react';
import { useOutfits } from '../features/saved/useOutfits';
import type { ToastAction } from '../session/types';
import { useSession } from '../session/useSession';
import { durations } from '../styles/tokens.stylex';
import { Toast } from '../ui/Toast';
import { useAnnounce } from '../ui/useAnnounce';

// Parsed rather than restated, as SHUFFLE_MS is in Suggestions.tsx; the
// whole-milliseconds format is held by tokens.stylex.test.ts.
const DWELL_MS = Number.parseInt(durations.toastDwell, 10);
const DWELL_ACTION_MS = Number.parseInt(durations.toastDwellAction, 10);

/**
 * The session's toast, on screen.
 *
 * In `app` because it is the one place allowed to reach both the session and a
 * feature: Undo restores through the saved outfits provider.
 *
 * Focus has three rules here. A delete asks for focus to go to Undo, because
 * the button that had it is gone and Undo would otherwise expire before a
 * keyboard user reached it. When a toast leaves while focus is on its
 * action, focus goes to the screen's heading rather than falling to the
 * document, whether it leaves through its own dismissal or because another
 * toast has replaced it before the first was done. After Undo, focus goes to
 * the restored card if the saved screen is showing.
 */
export function ToastHost() {
  const { state, dispatch } = useSession();
  const outfits = useOutfits();
  const announce = useAnnounce();
  const toast = state.toast;
  const actionRef = useRef<HTMLButtonElement>(null);
  // Set by the outgoing `Toast`'s `onUnmount`, from whether its action had
  // focus at the instant it left, including when a new toast has replaced it
  // outright, with no dismissal of its own to check `document.activeElement`
  // itself. Consumed once, by the effect below, for whichever toast arrives
  // next.
  const hadFocusOnReplace = useRef(false);
  // Set before the restore starts, so it is in place for the commit that
  // shows the restored list whichever of the promise and the render lands
  // first. `OutfitsProvider.run` does not serialise concurrent writes, so an
  // unrelated commit can land first; the effect below only clears this once
  // it has actually found one of these ids in the ready list, and `undo`
  // clears it itself if the restore fails, since no later commit will ever
  // match then.
  const focusAfterRestore = useRef<string[]>([]);

  useEffect(() => {
    if (!toast) return;
    announce(toast.message);
    if (toast.focusAction) {
      actionRef.current?.focus();
    } else if (hadFocusOnReplace.current) {
      document.querySelector<HTMLElement>('main h1')?.focus();
    }
    hadFocusOnReplace.current = false;
  }, [toast, announce]);

  useEffect(() => {
    const ids = focusAfterRestore.current;
    if (ids.length === 0 || outfits.state.status !== 'ready') return;
    const landed = new Set(outfits.state.outfits.map((outfit) => outfit.id));
    if (!ids.some((restoredId) => landed.has(restoredId))) return;
    focusAfterRestore.current = [];
    for (const id of ids) {
      const card = document.getElementById(`outfit-${id}`);
      if (card) {
        card.focus();
        break;
      }
    }
  }, [outfits.state]);

  if (!toast) return null;
  const { id } = toast;

  function leave() {
    const hadFocus = actionRef.current !== null && document.activeElement === actionRef.current;
    dispatch({ type: 'toastDismissed', id });
    if (hadFocus) document.querySelector<HTMLElement>('main h1')?.focus();
  }

  function undo(action: ToastAction) {
    leave();
    focusAfterRestore.current = action.outfits.map((outfit) => outfit.id);
    void outfits.restore(action.outfits).then((ok) => {
      if (!ok) {
        focusAfterRestore.current = [];
        dispatch({ type: 'toastShown', message: "Couldn't restore this outfit." });
      }
    });
  }

  const action = toast.action;

  return (
    <Toast
      key={id}
      message={toast.message}
      action={action && { label: action.label, onAction: () => undo(action) }}
      dwellMs={action ? DWELL_ACTION_MS : DWELL_MS}
      onExpire={leave}
      actionRef={actionRef}
      onUnmount={(hadFocus) => {
        hadFocusOnReplace.current = hadFocus;
      }}
    />
  );
}
