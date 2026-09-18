import { Route, Routes } from 'react-router';
import { NotFound } from '../ui/NotFound';
import { APP_ROUTES } from './routeTable';

export function AppRoutes() {
  return (
    <Routes>
      {APP_ROUTES.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
      {/* The catch-all serves no screen of its own, so it is not in the table
          the route list is checked against. */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
