import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

type Props = { fallback: ReactNode; children: ReactNode };
type State = { failed: boolean };

/**
 * Catches a developer chunk that fails to load, so a lazy import that rejects
 * replaces only the part of the screen it was for. Without it the rejection
 * reaches the root `ErrorBoundary` and the whole app goes blank.
 */
export class DevErrorBoundary extends Component<Props, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
