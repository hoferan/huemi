import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../model/hex';
import { BaseBlock } from './BaseBlock';

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
});
