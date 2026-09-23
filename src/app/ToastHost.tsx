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
 * keyboard user reached it. When the toast leaves while focus is on its
 * action, focus goes to the screen's heading rather than falling to the
 * document. After Undo, focus goes to the restored card if the saved screen
 * is showing.
 */
export function ToastHost() {
  const { state, dispatch } = useSession();
  const outfits = useOutfits();
  const announce = useAnnounce();
  const toast = state.toast;
  const actionRef = useRef<HTMLButtonElement>(null);
  // Set before the restore starts, so it is in place for the commit that
  // shows the restored list whichever of the promise and the render lands
  // first. Cleared by the first list change after it, found or not.
  const focusAfterRestore = useRef<string[]>([]);

  useEffect(() => {
    if (!toast) return;
    announce(toast.message);
    if (toast.focusAction) actionRef.current?.focus();
  }, [toast, announce]);

  useEffect(() => {
    const ids = focusAfterRestore.current;
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
      if (!ok) dispatch({ type: 'toastShown', message: "Couldn't restore this outfit." });
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
    />
  );
}
