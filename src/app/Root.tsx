import { BrowserRouter } from 'react-router';
import { OutfitsProvider } from '../features/saved/OutfitsProvider';
import { Announcer } from '../ui/Announcer';
import { HistoryTrail } from '../ui/HistoryTrail';
import { InitialLocation } from '../ui/InitialLocation';
import { AppRoutes } from './routes';
import { ErrorBoundary } from './ErrorBoundary';
import { SessionProvider } from '../session/SessionProvider';
import { ToastHost } from './ToastHost';

/**
 * Order matters. The error boundary is outermost so a render failure anywhere
 * below it, including inside the router, still leaves something on screen.
 * The live region sits above the routes so it survives a route change; a
 * region unmounted and remounted with the message already in it is never
 * announced. The session provider sits inside the router, because a later
 * screen will want the location, and outside the announcer, because nothing
 * in the announcer reads the session. `InitialLocation` goes directly under
 * the router and above the routes: it remembers the location the app arrived
 * on, which it can only do from somewhere that survives a route change.
 * `HistoryTrail` sits beside it for the same reason: it remembers the entries
 * walked, so a screen's back arrow can step back to one instead of pushing. The
 * outfits provider sits inside the session provider and above the routes, so
 * the bookmark, the saved screen and the toast's Undo share one list; the
 * toast host sits inside the announcer, beside the routes, so it outlives a
 * route change.
 */
export function Root() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <InitialLocation>
          <HistoryTrail>
            <SessionProvider>
              <OutfitsProvider>
                <Announcer>
                  <AppRoutes />
                  <ToastHost />
                </Announcer>
              </OutfitsProvider>
            </SessionProvider>
          </HistoryTrail>
        </InitialLocation>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
