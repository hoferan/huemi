/**
 * Deletes the correction log that versions before ADR 0017 kept.
 *
 * huemi logged each color the user corrected on the confirm screen, as
 * training data for the reader. Nothing ever read the log, so it was dropped,
 * and a phone that ran an earlier version still holds up to 200 entries
 * describing someone's wardrobe. Data the app no longer uses has no reason to
 * stay, so this runs once per start and costs one `removeItem` on a key that
 * is already gone.
 *
 * It can go once no installed copy older than ADR 0017 is likely to be left.
 */
export function forgetCorrections(): void {
  try {
    localStorage.removeItem('huemi.corrections');
  } catch {
    // Private mode or blocked storage: then there is nothing stored to forget.
  }
}
