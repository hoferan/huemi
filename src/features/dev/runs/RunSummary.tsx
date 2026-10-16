import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { AGAIN, EXPORT, UNDO } from './copy';

const styles = stylex.create({
  summary: { display: 'flex', flexDirection: 'column', gap: '16px' },
  headline: { fontFamily: tokens.fontHeading, fontSize: tokens.textBody, margin: 0 },
});

/** The end of a run: what it recorded, and what to do with it. */
export function RunSummary({
  headline,
  children,
  onExport,
  onAgain,
  onUndo,
}: {
  headline: string;
  children?: ReactNode;
  onExport: () => void;
  onAgain: () => void;
  /** Null when there is no answer left to take back. */
  onUndo: (() => void) | null;
}) {
  return (
    <section aria-label={headline} {...stylex.props(styles.summary)}>
      <p {...stylex.props(styles.headline)}>{headline}</p>
      {children}
      <Button label={EXPORT} onClick={onExport} />
      <Button label={AGAIN} variant="secondary" onClick={onAgain} />
      {onUndo && <Button label={UNDO} variant="quiet" onClick={onUndo} />}
    </section>
  );
}
