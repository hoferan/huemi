import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { checkOutfit, type WornPieces } from '../../../color/check';
import { parseHex } from '../../../model/hex';
import { CheckEnginePanel } from './CheckEnginePanel';

const pieces: WornPieces = { top: parseHex('#e9dfc9'), bottom: parseHex('#1f2a44') };

describe('CheckEnginePanel', () => {
  it('opens from an Engine chip onto the numbers behind each sentence', async () => {
    const user = userEvent.setup();
    render(<CheckEnginePanel pieces={pieces} observations={checkOutfit(pieces)!} />);
    await user.click(screen.getByRole('button', { name: 'Engine' }));
    expect(
      screen.getByText('mixed: Cream top warm (0.025) · Navy bottom cool (0.040)'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Bottom · Navy · L 0.29 · C 0.050 · carries 0.040 · cool'),
    ).toBeInTheDocument();
  });
});
