import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { clearOfToasts } from '../../../ui/toastClearance';
import { AGAIN, UNDO } from './copy';

const styles = stylex.create({
  summary: { display: 'flex', flexDirection: 'column', gap: '16px' },
  headline: { fontFamily: tokens.fontHeading, fontSize: tokens.textBody, margin: 0 },
});

/**
 * The end of a run: what it recorded, and what to do with it. The export is
 * the caller's control, since the field set's export is two taps with state
 * of its own (`ExportButton`).
 */
export function RunSummary({
  headline,
  children,
  exportControl,
  onAgain,
  onUndo,
  held = false,
}: {
  headline: string;
  children?: ReactNode;
  exportControl: ReactNode;
  onAgain: () => void;
  /** Null when there is no answer left to take back. */
  onUndo: (() => void) | null;
  /** Disables Another run and Undo, while the export is reading the set. */
  held?: boolean;
}) {
  return (
    <section aria-label={headline} {...clearOfToasts} {...stylex.props(styles.summary)}>
      <p {...stylex.props(styles.headline)}>{headline}</p>
      {children}
      {exportControl}
      <Button label={AGAIN} variant="secondary" disabled={held} onClick={onAgain} />
      {onUndo && <Button label={UNDO} variant="quiet" disabled={held} onClick={onUndo} />}
    </section>
  );
}
