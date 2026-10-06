import { use, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../../color/contrast';
import { hslToHex } from '../../../color/convert';
import { colorName } from '../../../color/palette';
import type { FieldGarment } from '../../../model/field';
import { useSession } from '../../../session/useSession';
import { tokens } from '../../../styles/tokens.stylex';
import { Button } from '../../../ui/Button';
import { Screen } from '../../../ui/Screen';
import { clearOfToasts } from '../../../ui/toastClearance';
import { ColorSliders, type Hsl } from '../../pick/ColorSliders';
import {
  ADD_A_COLOR,
  ADD_GARMENT,
  COLOR_COUNT,
  HINT,
  LABEL,
  LIST_BACK,
  NEEDS_LABEL,
  NEEDS_TWO_COLORS,
  ONE_COLOR,
  SAVE_FAILED,
  SAVE_GARMENT,
  SEVERAL_COLORS,
  colorGroup,
} from './copy';
import { FieldStoreContext } from './FieldStoreContext';

// A garment's truth is one color, or two to three (`FieldGarment`).
const MAX_COLORS = 3;

// Where the custom color screen's sliders start.
const START: Hsl = { hue: 210, saturation: 40, lightness: 50 };

const styles = stylex.create({
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  text: { margin: 0, color: tokens.ink2, fontSize: tokens.textBody, lineHeight: 1.5 },
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
  fieldset: {
    display: 'flex',
    flexWrap: 'wrap',
    columnGap: '16px',
    margin: 0,
    padding: 0,
    borderStyle: 'none',
  },
  legend: { padding: 0, marginBottom: '4px', color: tokens.ink2, fontSize: tokens.textBody },
  choice: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minHeight: tokens.touchTarget,
    fontSize: tokens.textBody,
  },
  color: { display: 'flex', flexDirection: 'column', gap: '8px' },
  preview: (background: string) => ({
    backgroundColor: background,
    borderRadius: tokens.radius,
    minHeight: '120px',
  }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  name: { margin: 0, color: tokens.ink, fontSize: tokens.textBody },
  error: { margin: 0, color: tokens.ink, fontSize: tokens.textBody },
});

const toHex = ({ hue, saturation, lightness }: Hsl) => hslToHex(hue, saturation, lightness);

type Problem = 'label' | 'colors' | null;

/**
 * A new garment: what to call it and its true colors, matched by eye against
 * the garment itself. Saving opens the garment, in place of this screen, so
 * Back from there returns to the list rather than to a filled-in form.
 */
export function NewGarment() {
  const store = use(FieldStoreContext);
  const { dispatch } = useSession();
  const navigate = useNavigate();
  const id = useId();
  const field = useRef<HTMLInputElement>(null);
  // Set while a save is out, so a second tap on Save cannot store the garment
  // twice under two ids.
  const saving = useRef(false);
  const [label, setLabel] = useState('');
  const [several, setSeveral] = useState(false);
  // All the colors made so far, so switching to one color and back keeps them.
  const [colors, setColors] = useState<Hsl[]>([START]);
  const [problem, setProblem] = useState<Problem>(null);
  // Keys the alert, so a repeated attempt is a new element a screen reader
  // announces again, as in the unlock sheet.
  const [attempt, setAttempt] = useState(0);
  const shown = several ? colors : colors.slice(0, 1);

  function complain(next: Exclude<Problem, null>) {
    setProblem(next);
    setAttempt((count) => count + 1);
    if (next === 'label') field.current?.focus();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    const trimmed = label.trim();
    if (trimmed === '') return complain('label');
    if (several && shown.length < 2) return complain('colors');
    setProblem(null);
    const garment: FieldGarment = {
      id: crypto.randomUUID(),
      label: trimmed,
      truth: shown.map(toHex),
      createdAt: new Date().toISOString(),
    };
    saving.current = true;
    const saved = await store.saveGarment(garment);
    if (!saved.ok) {
      // Open again, so the person can retry.
      saving.current = false;
      dispatch({ type: 'toastShown', message: SAVE_FAILED });
      return;
    }
    void navigate(`/dev/field/garment?id=${encodeURIComponent(garment.id)}`, { replace: true });
  }

  const labelError = `${id}-label-error`;

  return (
    <Screen title={ADD_GARMENT} back={LIST_BACK}>
      <p {...stylex.props(styles.text)}>{HINT}</p>
      <form onSubmit={(event) => void submit(event)} {...stylex.props(styles.form)}>
        <label {...stylex.props(styles.label)}>
          {LABEL}
          <input
            ref={field}
            type="text"
            autoComplete="off"
            value={label}
            aria-invalid={problem === 'label' || undefined}
            aria-describedby={problem === 'label' ? labelError : undefined}
            onChange={(event) => setLabel(event.target.value)}
            {...stylex.props(styles.field)}
          />
        </label>
        {problem === 'label' && (
          <p key={attempt} id={labelError} role="alert" {...stylex.props(styles.error)}>
            {NEEDS_LABEL}
          </p>
        )}

        <fieldset {...stylex.props(styles.fieldset)}>
          <legend {...stylex.props(styles.legend)}>{COLOR_COUNT}</legend>
          {[false, true].map((value) => (
            <label key={String(value)} {...stylex.props(styles.choice)}>
              <input
                type="radio"
                name={`${id}-count`}
                checked={several === value}
                onChange={() => {
                  setSeveral(value);
                  setProblem(null);
                }}
              />
              {value ? SEVERAL_COLORS : ONE_COLOR}
            </label>
          ))}
        </fieldset>

        {shown.map((hsl, i) => {
          const hex = toHex(hsl);
          return (
            <div
              key={i}
              role="group"
              aria-label={colorGroup(i + 1)}
              {...stylex.props(styles.color)}
            >
              <div {...stylex.props(styles.preview(hex), needsBorder(hex) && styles.hairline)} />
              <p {...stylex.props(styles.name)}>{colorName(hex)}</p>
              <ColorSliders
                hsl={hsl}
                idPrefix={`${id}-${i}-`}
                onChange={(next) =>
                  setColors((all) => all.map((color, j) => (j === i ? next : color)))
                }
              />
            </div>
          );
        })}

        {several && shown.length < MAX_COLORS && (
          <Button
            label={ADD_A_COLOR}
            variant="secondary"
            onClick={() => {
              setColors((all) => [...all, START]);
              setProblem(null);
            }}
          />
        )}
        {problem === 'colors' && (
          <p key={attempt} role="alert" {...stylex.props(styles.error)}>
            {NEEDS_TWO_COLORS}
          </p>
        )}
        <div {...clearOfToasts}>
          <Button type="submit" label={SAVE_GARMENT} />
        </div>
      </form>
    </Screen>
  );
}
