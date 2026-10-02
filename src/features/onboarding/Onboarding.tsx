import { useNavigate } from 'react-router';
import * as stylex from '@stylexjs/stylex';
import { needsBorder } from '../../color/contrast';
import type { Hex } from '../../model/hex';
import { localPreferences } from '../../storage/localPreferences';
import { tokens } from '../../styles/tokens.stylex';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { clearOfToasts } from '../../ui/toastClearance';
import { previewOutfit } from './preview';

// `fill` is the only dynamic entry, and StyleX wraps it in a null guard no
// call reaches: every block passes a hex. The ignore brackets the whole object
// for the reason Confirm.tsx gives.
/* v8 ignore start */
const styles = stylex.create({
  // The steps share the height above Start, as the garment rows do on the slot
  // screen. A basis of 0 and `1fr` rows for the reasons the picker's grid
  // gives; a window tall enough stops each step at 220px.
  steps: {
    flex: '1 1 0',
    display: 'grid',
    gridAutoRows: { default: '1fr', '@media (min-height: 1000px)': 'minmax(auto, 220px)' },
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  step: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '12px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.line,
    paddingBlock: '10px',
  },
  numeral: {
    fontFamily: tokens.fontHeading,
    fontSize: '2.5rem',
    lineHeight: 0.8,
    minWidth: '1.5ch',
  },
  text: {
    flex: '1',
    color: tokens.ink,
    fontSize: tokens.textBody,
    lineHeight: 1.3,
  },
  preview: {
    alignSelf: 'stretch',
    width: '48px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    borderRadius: '6px',
  },
  // The third step's outfit is the kept one, drawn the way a selected swatch
  // is: an ink outline a little outside it.
  kept: {
    outlineColor: tokens.ink,
    outlineStyle: 'solid',
    outlineWidth: '2px',
    outlineOffset: '2px',
  },
  block: { borderRadius: '4px', minHeight: '8px' },
  top: { flex: '1' },
  bottom: { flex: '1.2' },
  shoes: { flex: '0.6' },
  // Dynamic: the color is a runtime value (ADR 0002).
  fill: (background: string) => ({ backgroundColor: background }),
  hairline: { boxShadow: `inset 0 0 0 1px ${tokens.line}` },
  // A garment the step has not reached yet: an outline where it will go.
  empty: {
    borderWidth: '1px',
    borderStyle: 'dashed',
    borderColor: tokens.line,
  },
});
/* v8 ignore stop */

const OUTFIT = previewOutfit();

type Stage = 'base' | 'outfit' | 'kept';

const STEPS: readonly { text: string; stage: Stage }[] = [
  { text: 'Pick the color of one garment.', stage: 'base' },
  { text: 'See what works for the rest.', stage: 'outfit' },
  { text: 'Keep the outfits you like.', stage: 'kept' },
];

function Block({ hex, part }: { hex: Hex | null; part: 'top' | 'bottom' | 'shoes' }) {
  return (
    <span
      {...stylex.props(
        styles.block,
        styles[part],
        hex ? styles.fill(hex) : styles.empty,
        hex !== null && needsBorder(hex) && styles.hairline,
      )}
    />
  );
}

/**
 * The outfit as a step leaves it: the one garment first, then the rest the
 * engine suggests, then the same outfit kept.
 */
function StepPreview({ stage }: { stage: Stage }) {
  const filled = stage !== 'base';
  return (
    <div
      aria-hidden="true"
      data-testid="step-preview"
      {...stylex.props(styles.preview, stage === 'kept' && styles.kept)}
    >
      <Block hex={filled ? OUTFIT.top : null} part="top" />
      <Block hex={OUTFIT.bottom} part="bottom" />
      <Block hex={filled ? OUTFIT.shoes : null} part="shoes" />
    </div>
  );
}

/**
 * Shown once, and nothing else is on the screen.
 *
 * The three steps fill the screen above Start, each with its number and a
 * preview of the outfit it builds (PO, 2026-10-02). The preview is the outfit
 * the suggestions screen starts from for a Light grey bottom, so it shows
 * what the app does with the app's own answer. The steps are an ordered list,
 * which numbers them for a screen reader, so the drawn numerals and the
 * previews stay out of the accessibility tree.
 *
 * No skip control: this is three sentences behind one button, and a control
 * whose only job is to dismiss a screen a single tap already dismisses is
 * chrome explaining itself away. No paged steps either, since each step would
 * be another focus move to manage and a position indicator needing a text
 * equivalent, bought for three sentences.
 *
 * When `localStorage` throws, `setOnboarded` resolves anyway and the flag
 * never sticks, so this screen returns next visit. That is the accepted cost
 * of the preference store degrading rather than failing; the alternative is a
 * blocking error about a screen the user has already read.
 */
export function Onboarding() {
  const navigate = useNavigate();

  async function start() {
    await localPreferences.setOnboarded(true);
    // Shown once, so the entry screen replaces this history entry rather
    // than sitting behind it: back has to leave the app, not replay
    // onboarding from /welcome.
    void navigate('/', { replace: true });
  }

  return (
    <Screen title="One piece you own. The rest that goes with it." documentTitle="Welcome">
      <ol {...stylex.props(styles.steps)}>
        {STEPS.map(({ text, stage }, index) => (
          <li key={stage} {...stylex.props(styles.step)}>
            <span aria-hidden="true" {...stylex.props(styles.numeral)}>
              {index + 1}
            </span>
            <span {...stylex.props(styles.text)}>{text}</span>
            <StepPreview stage={stage} />
          </li>
        ))}
      </ol>
      <div {...clearOfToasts}>
        <Button label="Start" onClick={() => void start()} />
      </div>
    </Screen>
  );
}
