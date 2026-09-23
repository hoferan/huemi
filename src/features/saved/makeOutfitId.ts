/**
 * A saved outfit's id. `crypto.randomUUID` needs a secure context, which an
 * `http://` origin is not, so a save there falls back to a shorter random
 * string instead of throwing.
 */
export function makeOutfitId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
