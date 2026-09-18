import { Route, Routes } from 'react-router';
import App from '../App';
import { NotFound } from '../ui/NotFound';
import { Screen } from '../ui/Screen';

/**
 * One route per screen. Adding a route here means adding it to
 * `e2e/routes.ts` in the same pull request, or the axe, reflow and
 * text-size checks will not see the new screen.
 *
 * The root still renders M1's spike screen. #14 replaces it with the entry
 * screen and deletes `src/App.tsx`.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Screen title="huemi">
            <App />
          </Screen>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
