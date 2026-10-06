import { use, useRef } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { FieldGarment } from '../../../model/field';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { Sheet } from '../../../ui/Sheet';
import { LINK_FAILED, LINK_TO_GARMENT, NO_GARMENTS } from './copy';
import { FieldStoreContext } from './FieldStoreContext';

const styles = stylex.create({
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
});

/**
 * Links a capture from normal use to the garment it shows. The sheet closes
 * either way; a failed link leaves the capture waiting and says so.
 */
export function LinkCapture({
  captureId,
  garments,
  onLinked,
  onClose,
}: {
  captureId: string;
  garments: readonly FieldGarment[];
  onLinked: (garmentId: string) => void;
  onClose: () => void;
}) {
  const store = use(FieldStoreContext);
  const { dispatch } = useSession();
  // Set while a link is out, so a double tap links once.
  const busy = useRef(false);

  async function link(garmentId: string) {
    if (busy.current) return;
    busy.current = true;
    const linked = await store.linkCapture(captureId, garmentId);
    busy.current = false;
    if (linked.ok) onLinked(garmentId);
    else dispatch({ type: 'toastShown', message: LINK_FAILED });
    onClose();
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={LINK_TO_GARMENT}
    >
      {garments.length === 0 ? (
        <p {...stylex.props(styles.text)}>{NO_GARMENTS}</p>
      ) : (
        <div {...stylex.props(styles.list)}>
          {garments.map((garment) => (
            <Button
              key={garment.id}
              label={garment.label}
              variant="secondary"
              onClick={() => void link(garment.id)}
            />
          ))}
        </div>
      )}
    </Sheet>
  );
}
