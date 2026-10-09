import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { parseHex, type Hex } from '../../../model/hex';
import type { Slot } from '../../../model/types';
import { SuggestEnginePanel } from './SuggestEnginePanel';

const mustard: Partial<Record<Slot, Hex>> = {
  outerwear: parseHex('#8a8a8a'),
  top: parseHex('#c39a3a'),
  bottom: parseHex('#e6e5e2'),
  shoes: parseHex('#c9ad86'),
  accessory: parseHex('#b58a5a'),
};

describe('SuggestEnginePanel', () => {
  it('opens from an Engine chip onto the outfit on screen', async () => {
    const user = userEvent.setup();
    render(<SuggestEnginePanel baseSlot="top" pieces={mustard} />);
    await user.click(screen.getByRole('button', { name: 'Engine' }));
    expect(screen.getByText('Outfit chroma 0.114 of 0.120')).toBeInTheDocument();
    expect(screen.getByText('Bottom · Light grey · #11 of 21 · 1.85')).toBeInTheDocument();
    expect(screen.getByText('Mauve: chroma 0.183')).toBeInTheDocument();
  });

  // Shuffle sits below the panel and stays usable, so the panel has to follow
  // the outfit it changes without being reopened.
  it('follows a new outfit while it is open', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<SuggestEnginePanel baseSlot="top" pieces={mustard} />);
    await user.click(screen.getByRole('button', { name: 'Engine' }));
    rerender(
      <SuggestEnginePanel baseSlot="top" pieces={{ ...mustard, bottom: parseHex('#e9dfc9') }} />,
    );
    expect(screen.getByRole('button', { name: 'Engine' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/^Bottom · Cream · #/)).toBeInTheDocument();
  });
});
