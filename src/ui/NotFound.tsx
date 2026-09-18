import { Link } from 'react-router';
import { Screen } from './Screen';

export function NotFound() {
  return (
    <Screen title="Page not found">
      <p>That address does not lead anywhere in huemi.</p>
      <Link to="/">Start again</Link>
    </Screen>
  );
}
