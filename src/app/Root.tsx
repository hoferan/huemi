import { BrowserRouter } from 'react-router';
import { Announcer } from '../ui/Announcer';
import { AppRoutes } from './routes';
import { ErrorBoundary } from './ErrorBoundary';
import { SessionProvider } from './SessionProvider';

/**
 * Order matters. The error boundary is outermost so a render failure anywhere
 * below it, including inside the router, still leaves something on screen.
 * The live region sits above the routes so it survives a route change; a
 * region unmounted and remounted with the message already in it is never
 * announced. The session provider sits inside the router, because a later
 * screen will want the location, and outside the announcer, because nothing
 * in the announcer reads the session.
 */
export function Root() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <Announcer>
            <AppRoutes />
          </Announcer>
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
