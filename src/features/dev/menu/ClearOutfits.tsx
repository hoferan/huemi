import { Button } from '../../../ui/Button';
import { Sheet } from '../../../ui/Sheet';

/**
 * Asks before every saved outfit goes. The count is live: the title follows the
 * menu's list of outfits for as long as the sheet is open.
 */
export function ClearOutfits({
  count,
  onConfirm,
  onClose,
}: {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Delete all ${count} saved ${count === 1 ? 'outfit' : 'outfits'}?`}
    >
      <Button label="Delete all" onClick={onConfirm} />
      <Button label="Keep them" variant="secondary" onClick={onClose} />
    </Sheet>
  );
}
