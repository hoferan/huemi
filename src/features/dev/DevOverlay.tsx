import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../../styles/tokens.stylex';

const styles = stylex.create({
  // Above the panel, so the one button that opens it also closes it.
  toggle: {
    position: 'absolute',
    top: '6px',
    left: '6px',
    zIndex: 2,
    minHeight: tokens.touchTarget,
    minWidth: tokens.touchTarget,
    paddingInline: '12px',
    borderStyle: 'none',
    borderRadius: tokens.radiusMedia,
    backgroundColor: tokens.dark,
    color: tokens.darkFg,
    fontFamily: tokens.fontBody,
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  // Covers whatever box the slot sits in. It scrolls rather than clips, since
  // the 200% text-size check in e2e/invariants.spec.ts fails any element that
  // hides its own overflow.
  panel: {
    position: 'absolute',
    inset: 0,
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    overflowY: 'auto',
    padding: '12px',
    paddingTop: `calc(${tokens.touchTarget} + 18px)`,
    borderRadius: tokens.radius,
    backgroundColor: tokens.dark,
    color: tokens.darkFg,
    fontFamily: tokens.fontBody,
    fontSize: '0.8125rem',
    lineHeight: 1.4,
    fontVariantNumeric: 'tabular-nums',
  },
});

/**
 * A developer-mode chip that opens a panel over the box its slot sits in. The
 * screen makes that box positioned. Closed, only the chip shows; open, the
 * panel covers the box and renders `children`, which mount only while it is
 * open.
 */
export function DevOverlay({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        {...stylex.props(styles.toggle)}
      >
        {label} <span aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <div id={id} {...stylex.props(styles.panel)}>
          {children}
        </div>
      )}
    </>
  );
}
