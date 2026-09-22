import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import * as stylex from '@stylexjs/stylex';
import { parseHex } from '../model/hex';
import { BaseBlock } from './BaseBlock';

const styles = stylex.create({
  grow: { flexGrow: 1.6 },
});

describe('BaseBlock', () => {
  it('names the group with the slot and the colour', () => {
    render(<BaseBlock slot="top" hex={parseHex('#a9bfd4')} />);
    expect(screen.getByRole('group', { name: 'Top: Pale blue' })).toBeInTheDocument();
  });

  it('offers no controls, because the base is the one colour the user chose', () => {
    render(<BaseBlock slot="top" hex={parseHex('#a9bfd4')} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('says in words that this is the base, not only with a padlock', () => {
    render(<BaseBlock slot="top" hex={parseHex('#a9bfd4')} />);
    expect(screen.getByText('Base')).toBeInTheDocument();
  });

  it('accepts the style and fade the suggestions screen sizes and fades it with', () => {
    // StyleX emits no CSS under Vitest (ADR 0002), so this asserts only that
    // Suggestions.tsx's pass-through props are accepted and the block still
    // renders. The rendered size and duration are covered by the e2e axe scan
    // against a real build.
    render(<BaseBlock slot="top" hex={parseHex('#a9bfd4')} style={styles.grow} fade="200ms" />);
    expect(screen.getByRole('group', { name: 'Top: Pale blue' })).toBeInTheDocument();
  });
});
