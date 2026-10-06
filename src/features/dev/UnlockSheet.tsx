import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import * as stylex from '@stylexjs/stylex';
import { useSession } from '../../session/useSession';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Sheet } from '../../ui/Sheet';
import { useDevMode } from './useDevMode';

const styles = stylex.create({
  form: { display: 'flex', flexDirection: 'column', gap: '12px' },
  label: { display: 'flex', flexDirection: 'column', gap: '4px', fontSize: tokens.textBody },
  field: {
    minHeight: tokens.touchTarget,
    paddingInline: '12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: tokens.radius,
    backgroundColor: tokens.bg,
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    fontSize: tokens.textBody,
  },
  error: { margin: 0, color: tokens.ink, fontSize: tokens.textBody },
});

function UnlockForm({ onDone }: { onDone: () => void }) {
  const { tryPassphrase } = useDevMode();
  const { dispatch } = useSession();
  const [passphrase, setPassphrase] = useState('');
  // Counts wrong attempts. It keys the alert, so each one is a new element
  // that a screen reader announces, where the same text left in place is not.
  const [wrong, setWrong] = useState(0);
  const field = useRef<HTMLInputElement>(null);
  const errorId = useId();

  async function submit(event: FormEvent) {
    event.preventDefault();
    // A check that throws, as hashing does without `crypto.subtle` on an
    // insecure origin, is the same answer to the person as a wrong passphrase.
    const unlocked = await tryPassphrase(passphrase).catch(() => false);
    if (unlocked) {
      dispatch({ type: 'toastShown', message: 'Developer mode on' });
      onDone();
      return;
    }
    setWrong((count) => count + 1);
    field.current?.focus();
  }

  return (
    <form onSubmit={(event) => void submit(event)} {...stylex.props(styles.form)}>
      <label {...stylex.props(styles.label)}>
        Passphrase
        <input
          ref={field}
          type="password"
          autoComplete="off"
          value={passphrase}
          aria-invalid={wrong > 0 || undefined}
          aria-describedby={wrong > 0 ? errorId : undefined}
          onChange={(event) => setPassphrase(event.target.value)}
          {...stylex.props(styles.field)}
        />
      </label>
      {wrong > 0 && (
        <p key={wrong} id={errorId} role="alert" {...stylex.props(styles.error)}>
          That passphrase is not right.
        </p>
      )}
      <Button type="submit" label="Unlock" />
    </form>
  );
}

/**
 * Asks for the passphrase in a build that has one. Like every `Sheet`, it is
 * mounted only while it is open, so the field is empty each time it opens.
 */
export function UnlockSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Developer mode">
      <UnlockForm onDone={() => onOpenChange(false)} />
    </Sheet>
  );
}
