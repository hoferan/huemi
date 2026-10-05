import { useRef, useState } from 'react';
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
  const [wrong, setWrong] = useState(false);
  const field = useRef<HTMLInputElement>(null);

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
    setWrong(true);
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
          onChange={(event) => setPassphrase(event.target.value)}
          {...stylex.props(styles.field)}
        />
      </label>
      {wrong && (
        <p role="alert" {...stylex.props(styles.error)}>
          That passphrase is not right.
        </p>
      )}
      <Button type="submit" label="Unlock" />
    </form>
  );
}

/**
 * Asks for the passphrase in a build that has one. The form is the sheet's
 * child, so the field is empty each time the sheet opens.
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
