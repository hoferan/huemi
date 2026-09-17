import { useState } from 'react';
import * as stylex from '@stylexjs/stylex';
import { tokens } from '../styles/tokens.stylex';
import { parseHex, type Hex } from '../model/hex';
import { SLOTS, SLOT_LABELS, type Slot, type Suggestion } from '../model/types';
import { PALETTE } from '../color/palette';
import { readableForeground } from '../color/contrast';
import { chromaLoad, hueContrast, lightnessContrast } from '../color/score';
import { rate, suggest } from '../color/engine';

type SortKey = 'rank' | 'lightness' | 'hue' | 'load';

const SORTS: Readonly<Record<SortKey, string>> = {
  rank: 'Engine rank',
  lightness: 'Lightness contrast',
  hue: 'Hue contrast',
  load: 'Chroma load',
};

const styles = stylex.create({
  page: {
    backgroundColor: tokens.bg,
    color: tokens.ink,
    fontFamily: tokens.fontBody,
    minHeight: '100vh',
    padding: '16px',
  },
  controls: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  label: { fontSize: '13px', color: tokens.ink2 },
  swatchRow: { display: 'flex', flexWrap: 'wrap', gap: '4px' },
  swatch: (background: string) => ({
    backgroundColor: background,
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    borderStyle: 'solid',
    padding: 0,
    cursor: 'pointer',
  }),
  swatchOff: { borderWidth: '1px', borderColor: tokens.line },
  swatchOn: { borderWidth: '3px', borderColor: tokens.ink },
  chip: {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: tokens.line,
    borderRadius: '999px',
    padding: '4px 12px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  chipOff: { backgroundColor: 'transparent', color: tokens.ink },
  chipOn: { backgroundColor: tokens.primary, color: tokens.primaryFg },
  slotHeading: {
    fontFamily: tokens.fontHeading,
    fontSize: '15px',
    margin: '16px 0 8px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
    gap: '8px',
  },
  pair: {
    borderRadius: tokens.radius,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  block: (background: string, color: string) => ({
    backgroundColor: background,
    color,
    minHeight: '84px',
    display: 'flex',
    alignItems: 'flex-end',
    padding: '6px 8px',
    fontSize: '12px',
  }),
  numbers: {
    backgroundColor: tokens.surface,
    padding: '6px 8px',
    fontSize: '11px',
    fontVariantNumeric: 'tabular-nums',
    display: 'flex',
    justifyContent: 'space-between',
  },
});

const BASE = parseHex('#1f2a44');

const fmt = (n: number) => n.toFixed(3);

export default function Harness() {
  const [base, setBase] = useState<Hex>(BASE);
  const [baseSlot, setBaseSlot] = useState<Slot>('bottom');
  const [sort, setSort] = useState<SortKey>('rank');

  const measure = (hex: Hex, slot: Slot) => ({
    lightness: lightnessContrast(base, hex),
    hue: hueContrast(base, hex),
    load: chromaLoad({ [baseSlot]: base, [slot]: hex }),
    score: rate(base, hex, slot, baseSlot),
  });

  // 'rank' keeps the engine's own order. The others re-sort by one primitive,
  // which is how you see what any single term is doing on its own.
  const sorted = (ranked: Suggestion[], slot: Slot) => {
    if (sort === 'rank') return ranked;
    const by = (hex: Hex) => {
      const m = measure(hex, slot);
      if (sort === 'hue') return m.hue ?? -1;
      return sort === 'load' ? m.load : m.lightness;
    };
    return [...ranked].sort((a, b) => by(b.hex) - by(a.hex));
  };

  const baseFg = readableForeground(base).color;

  return (
    <main {...stylex.props(styles.page)}>
      <div {...stylex.props(styles.controls)}>
        <span {...stylex.props(styles.label)}>Base</span>
        <div {...stylex.props(styles.swatchRow)}>
          {PALETTE.map((color) => (
            <button
              key={color.hex}
              type="button"
              title={color.name}
              onClick={() => setBase(color.hex)}
              {...stylex.props(
                styles.swatch(color.hex),
                color.hex === base ? styles.swatchOn : styles.swatchOff,
              )}
            />
          ))}
        </div>
      </div>

      <div {...stylex.props(styles.controls)}>
        <span {...stylex.props(styles.label)}>Base slot</span>
        {SLOTS.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => setBaseSlot(slot)}
            {...stylex.props(styles.chip, slot === baseSlot ? styles.chipOn : styles.chipOff)}
          >
            {SLOT_LABELS[slot]}
          </button>
        ))}
        <span {...stylex.props(styles.label)}>Sort by</span>
        {(Object.keys(SORTS) as SortKey[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            {...stylex.props(styles.chip, key === sort ? styles.chipOn : styles.chipOff)}
          >
            {SORTS[key]}
          </button>
        ))}
      </div>

      {SLOTS.filter((slot) => slot !== baseSlot).map((slot) => (
        <section key={slot}>
          <h2 {...stylex.props(styles.slotHeading)}>{SLOT_LABELS[slot]}</h2>
          <div {...stylex.props(styles.grid)}>
            {sorted(suggest(base, slot, baseSlot), slot).map((candidate) => {
              const m = measure(candidate.hex, slot);
              const fg = readableForeground(candidate.hex).color;
              return (
                <div key={candidate.hex} {...stylex.props(styles.pair)}>
                  <div {...stylex.props(styles.block(base, baseFg))}>{SLOT_LABELS[baseSlot]}</div>
                  <div {...stylex.props(styles.block(candidate.hex, fg))}>{candidate.name}</div>
                  <div {...stylex.props(styles.numbers)}>
                    <span>L {fmt(m.lightness)}</span>
                    <span>H {m.hue === null ? 'n/a' : m.hue.toFixed(0)}</span>
                    <span>C {fmt(m.load)}</span>
                    <span>= {fmt(m.score)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}
