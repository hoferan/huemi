import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import type { Light } from '../../../model/field';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { ChipGroup } from '../field/ChipGroup';
import { LightChips } from '../field/LightChips';
import { CHOOSE_LENGTH, CHOOSE_LIGHT, LENGTH_GROUP, START } from './copy';

const styles = stylex.create({
  setup: { display: 'flex', flexDirection: 'column', gap: '16px' },
  prompt: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
});

/** The lengths a run can have. Exactly these three. */
const LENGTHS = [10, 20, 30] as const;
type RunLength = (typeof LENGTHS)[number];
const LENGTH_OPTIONS = LENGTHS.map((length) => ({ value: length, label: String(length) }));

/**
 * What a run needs before it starts: how many questions, and for a reading
 * run the light the garment is in. Start stays enabled and says what is
 * missing when pressed early, because a disabled button gives no reason
 * (A11Y.md).
 */
export function RunSetup({
  withLight,
  onStart,
}: {
  withLight: boolean;
  onStart: (setup: { length: RunLength; light: Light | null }) => void;
}) {
  const [length, setLength] = useState<RunLength | null>(null);
  const [light, setLight] = useState<Light | null>(null);
  const [missing, setMissing] = useState<string | null>(null);

  function start() {
    if (length === null) {
      setMissing(CHOOSE_LENGTH);
      return;
    }
    if (withLight && light === null) {
      setMissing(CHOOSE_LIGHT);
      return;
    }
    onStart({ length, light: withLight ? light : null });
  }

  return (
    <div {...stylex.props(styles.setup)}>
      <ChipGroup
        label={LENGTH_GROUP}
        options={LENGTH_OPTIONS}
        value={length}
        onChange={(chosen) => {
          setLength(chosen);
          setMissing(null);
        }}
      />
      {withLight && (
        <LightChips
          value={light}
          onChange={(chosen) => {
            setLight(chosen);
            setMissing(null);
          }}
        />
      )}
      {missing && (
        <p role="status" {...stylex.props(styles.prompt)}>
          {missing}
        </p>
      )}
      <Button label={START} onClick={start} />
    </div>
  );
}
