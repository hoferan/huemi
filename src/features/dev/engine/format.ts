/**
 * A measurement and the threshold it was read against, as two strings at
 * `digits` decimals, or more if that would print two different numbers alike.
 * The panels exist for readings that look wrong, and those sit near a
 * threshold, where "0.120 over 0.120" would hide the difference that decided.
 */
export function sideBySide(value: number, limit: number, digits: number): [string, string] {
  for (let places = digits; places < 6; places += 1) {
    const pair: [string, string] = [value.toFixed(places), limit.toFixed(places)];
    if (value === limit || pair[0] !== pair[1]) return pair;
  }
  return [value.toFixed(6), limit.toFixed(6)];
}
