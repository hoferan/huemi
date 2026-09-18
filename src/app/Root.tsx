import { BrowserRouter } from 'react-router';
import { Announcer } from '../ui/Announcer';
import { AppRoutes } from './routes';
import { ErrorBoundary } from './ErrorBoundary';

/**
 * Order matters. The error boundary is outermost so a render failure anywhere
 * below it, including inside the router, still leaves something on screen.
 * The live region sits above the routes so it survives a route change; a
 * region unmounted and remounted with the message already in it is never
 * announced.
 */
export function Root() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Announcer>
          <AppRoutes />
        </Announcer>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
