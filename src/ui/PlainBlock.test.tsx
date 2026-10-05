import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { colorName } from '../color/palette';
import { parseHex } from '../model/hex';
import { PlainBlock } from './PlainBlock';

describe('PlainBlock', () => {
  it('names the piece by slot and color', () => {
    render(<PlainBlock slot="top" hex={parseHex('#1f2a44')} />);

    const block = screen.getByRole('group', { name: 'Top: Navy' });
    expect(within(block).getByText('Navy')).toBeInTheDocument();
    expect(within(block).getByText('Top')).toBeInTheDocument();
  });

  it('has no controls', () => {
    render(<PlainBlock slot="top" hex={parseHex('#1f2a44')} />);

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('describes a color the palette cannot name', () => {
    const magenta = parseHex('#c431c4');
    render(<PlainBlock slot="top" hex={magenta} />);

    expect(screen.getByText(colorName(magenta))).toBeInTheDocument();
  });
});
