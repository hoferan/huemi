// Every route the app serves. The invariant checks run once per entry, so a
// route missing from this list is a route the accessibility gate does not
// cover. `src/app/routes.test.tsx` compares this list with the route table in
// `src/app/routeTable.tsx` in both directions, so a route added to one and not
// the other fails the unit suite.
//
// The unknown path is deliberate: the catch-all renders a real screen, and a
// screen nobody designed is exactly the kind that fails a contrast or heading
// check unnoticed.
export const ROUTES: readonly string[] = ['/', '/this-route-does-not-exist'];
