import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * The one error boundary in the app, at the root. React has no hook form, so
 * this is the only class component in the codebase.
 *
 * It says nothing about what went wrong. An error message from a render
 * failure is for a developer, and the console already has it; the screen is
 * for someone standing at a wardrobe.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.failed) {
      return (
        <main>
          <h1>Something went wrong</h1>
          <p>Reload the page to start again.</p>
        </main>
      );
    }
    return this.props.children;
  }
}
