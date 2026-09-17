export type Hex = string & { readonly __brand: 'Hex' };

const SIX = /^#[0-9a-f]{6}$/i;
const THREE = /^#[0-9a-f]{3}$/i;
// Canonical form: lowercase, six digits, no whitespace. Used only by isHex to
// narrow to values that are already exactly what parseHex would produce.
const CANONICAL = /^#[0-9a-f]{6}$/;

export function isHex(value: string): value is Hex {
  return CANONICAL.test(value);
}

/**
 * The only way to produce a Hex. Hexes reach this app from three untrusted
 * sources — camera reads, localStorage and the free picker — so validation
 * happens once, here, and the type records that it happened.
 *
 * Trims whitespace to be defensive against user input, especially from
 * localStorage where values may be hand-edited. After normalization to
 * lowercase, the result is canonical: if isHex(result) is called, it will
 * return true, guaranteeing string-equal comparison.
 */
export function parseHex(value: string): Hex {
  const trimmed = value.trim();
  if (SIX.test(trimmed)) return trimmed.toLowerCase() as Hex;
  if (THREE.test(trimmed)) {
    // Indexed with charAt rather than destructuring: under
    // noUncheckedIndexedAccess a destructured char is `string | undefined`.
    const short = trimmed.toLowerCase();
    const r = short.charAt(1);
    const g = short.charAt(2);
    const b = short.charAt(3);
    return `#${r}${r}${g}${g}${b}${b}` as Hex;
  }
  throw new Error(`Invalid hex color: ${value}`);
}
