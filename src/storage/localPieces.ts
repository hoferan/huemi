import { FULL_SHAPE, type Shape } from '../model/shape';
import type { PiecesStore } from './port';

/** Exported so a test can seed storage without restating the string. */
export const PIECES_KEY = 'huemi.pieces';

/**
 * The remembered pieces, as `{"outerwear":false,"accessory":true,"dress":true}`.
 * It stays on the device like everything else huemi keeps (ADR 0013).
 *
 * Only a literal `false` leaves a piece out, and only a literal `true` wears a
 * dress. Nothing stored, a value that is not JSON, and a storage that throws in
 * private mode all read as wearing everything with a top and a bottom, which
 * is how huemi behaved before the pieces could change. A value written before
 * the dress has no `dress` field and reads the same way. A write that fails is
 * dropped, and the screen keeps the change in memory.
 */
export const localPieces: PiecesStore = {
  read(): Shape {
    try {
      const raw = localStorage.getItem(PIECES_KEY);
      const stored: unknown = raw === null ? null : JSON.parse(raw);
      if (typeof stored !== 'object' || stored === null) return FULL_SHAPE;
      const fields = stored as Record<string, unknown>;
      return {
        outerwear: fields.outerwear !== false,
        accessory: fields.accessory !== false,
        dress: fields.dress === true,
      };
    } catch {
      return FULL_SHAPE;
    }
  },

  write(shape: Shape): void {
    try {
      localStorage.setItem(
        PIECES_KEY,
        JSON.stringify({
          outerwear: shape.outerwear,
          accessory: shape.accessory,
          dress: shape.dress,
        }),
      );
    } catch {
      // Not worth failing a screen for; the outfit on screen already changed.
    }
  },
};
