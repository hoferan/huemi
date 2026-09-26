// Every route the app serves. The invariant checks run once per entry, so a
// route missing from this list is a route the accessibility gate does not
// cover. `src/app/routes.test.tsx` compares this list with the route table in
// `src/app/routeTable.tsx` in both directions, so a route added to one and not
// the other fails the unit suite.
//
// The unknown path is deliberate: the catch-all renders a real screen, and a
// screen nobody designed is exactly the kind that fails a contrast or heading
// check unnoticed.
export const ROUTES: readonly string[] = [
  '/',
  '/welcome',
  '/slot',
  '/color?slot=top',
  '/color/custom?slot=top',
  '/camera?slot=top',
  // Without a capture this redirects to the camera, so the sweep sees the
  // camera again. `e2e/features/confirm.feature` carries the same checks into
  // the confirm screen's three states.
  '/confirm?slot=top',
  '/check',
  // Without a photo this redirects to /check, so the sweep sees the outfit
  // camera again. `e2e/features/check.feature` carries the checks into the
  // tap screen with a photo.
  '/check/tap',
  '/check/pieces',
  // Without a check this redirects to /check, so the sweep sees the outfit
  // camera again. `e2e/features/check.feature` carries the checks onto the
  // result with an outfit and with the swap sheet open.
  '/check/result',
  '/suggest?slot=top&hex=%23c39a3a',
  '/saved',
  '/this-route-does-not-exist',
];
