import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as stylex from '@stylexjs/stylex';
import { Dialog } from 'radix-ui';
import { tokens } from '../styles/tokens.stylex';
import { SheetHandle } from './SheetHandle';
import { useDragDismiss } from './useDragDismiss';

const styles = stylex.create({
  overlay: { position: 'fixed', inset: 0, backgroundColor: tokens.scrim },
  sheet: {
    position: 'fixed',
    insetInline: 0,
    bottom: 0,
    maxHeight: '72dvh',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '12px 16px 16px',
    borderStartStartRadius: tokens.radius,
    borderStartEndRadius: tokens.radius,
    backgroundColor: tokens.bg,
    color: tokens.ink,
    boxShadow: tokens.shadowSheet,
    transitionProperty: 'transform',
    transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
  },
  // Dynamic: the offset is a runtime value from the drag. While a finger is
  // down the sheet tracks it exactly, so the transition is off; on release it
  // springs back over the sheet duration, which gates on reduced motion inside
  // the token.
  drag: (offset: number) => ({
    transform: `translateY(${offset}px)`,
    transitionDuration: offset === 0 ? tokens.sheet : '0ms',
  }),
  title: { fontFamily: tokens.fontHeading, fontSize: '1.25rem', margin: 0 },
  body: { flexGrow: 1, minHeight: 0, overflowY: 'auto', touchAction: 'pan-y' },
});

/**
 * A bottom sheet.
 *
 * Radix `Dialog` supplies the focus trap, the escape key, `aria-modal` and the
 * scroll lock, and none of what the handoff notes actually ask for: it has no
 * drag-to-dismiss and no spring. Both are written here, which is the cost the
 * issue said to budget for rather than discover late.
 *
 * The close control is the shared `SheetHandle`; see its doc comment for why
 * it is a real button. The drag hangs off it here, and the body keeps
 * `touch-action: pan-y` so a list inside can still scroll under the same
 * finger.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  const sheet = useRef<HTMLDivElement>(null);

  // Where focus came from, so it can be given back.
  //
  // Radix restores focus on its own only through `Dialog.Trigger`: its modal
  // content prevents the default close-autofocus and focuses the trigger
  // instead. This sheet has no trigger — it is opened by a control several
  // components away, and rendering a `Dialog.Trigger` there would put the
  // sheet's markup inside a colour block. With the trigger ref empty, Radix
  // prevented the default and then focused nothing, so every choice made in
  // the sheet dropped a keyboard user back at the start of the document, on
  // the screen the brief calls the app's central interaction.
  //
  // Read in a state initialiser because that runs during the first render,
  // ahead of every effect in the tree below it, and the focus scope inside
  // `Dialog.Content` moves focus from one of those.
  const [opener] = useState(() =>
    open && document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );

  const { offset, onPointerDown, dragged } = useDragDismiss({
    onDismiss: () => onOpenChange(false),
    height: () => sheet.current?.offsetHeight ?? 0,
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay {...stylex.props(styles.overlay)} />
        <Dialog.Content
          ref={sheet}
          // Fires on unmount as well as on close, which is how this sheet
          // always goes away: the caller stops rendering it rather than
          // setting `open` to false. Left to Radix it lands on nothing.
          onCloseAutoFocus={(event) => {
            if (!opener?.isConnected) return;
            event.preventDefault();
            opener.focus();
          }}
          {...stylex.props(styles.sheet, styles.drag(offset))}
        >
          <SheetHandle
            label="Close"
            onClose={() => onOpenChange(false)}
            onPointerDown={onPointerDown}
            dragged={dragged}
          />
          <Dialog.Title {...stylex.props(styles.title)}>{title}</Dialog.Title>
          {description ? (
            <Dialog.Description>{description}</Dialog.Description>
          ) : (
            <Dialog.Description />
          )}
          <div {...stylex.props(styles.body)}>{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
