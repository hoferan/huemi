import { BrowserRouter } from 'react-router';
import { Announcer } from '../ui/Announcer';
import { InitialLocation } from '../ui/InitialLocation';
import { AppRoutes } from './routes';
import { ErrorBoundary } from './ErrorBoundary';
import { SessionProvider } from '../session/SessionProvider';

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
 */
export function Root() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <InitialLocation>
          <SessionProvider>
            <Announcer>
              <AppRoutes />
            </Announcer>
          </SessionProvider>
        </InitialLocation>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
