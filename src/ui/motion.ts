/**
 * Whether the user asked for less motion.
 *
 * Read at call time rather than cached at module load: the setting can change
 * while the app is open, and a cached `false` would keep vibrating for the
 * rest of the session. `matchMedia` is absent in jsdom and in any non-browser
 * environment, and an absent query is not a preference for motion, so the
 * honest answer there is "no preference expressed" — false.
 */
export function prefersReducedMotion(): boolean {
  if (typeof matchMedia !== 'function') return false;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A haptic tick, unless the user asked for less motion.
 *
 * Absent on iOS Safari, which is acceptable: no information is carried by the
 * vibration alone, so degrading to nothing loses nothing. Guarded by a type
 * check rather than optional call syntax because `lib.dom` declares
 * `vibrate` as always present on `Navigator`, so `?.` would be flagged as an
 * unnecessary condition while still being the only thing standing between
 * this and a TypeError on the app's main interaction.
 */
export function vibrate(pattern: number | number[]): void {
  if (prefersReducedMotion()) return;
  if (typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(pattern);
}
