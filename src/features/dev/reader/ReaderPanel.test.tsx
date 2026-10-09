import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { colorsIn, defaultRegion, readColor, tapRegion, type Region } from '../../../color/read';
import { NAVY, WHITE, busy, paint, solid } from '../../../color/testing';
import type { Pixels } from '../../../model/frame';
import { ReaderPanel } from './ReaderPanel';
import { verdictText } from './readout';

function renderPanel(pixels: Pixels, region: Region = defaultRegion(pixels), lowLight = false) {
  render(<ReaderPanel frame={{ pixels, source: 'camera' }} region={region} lowLight={lowLight} />);
  return userEvent.setup();
}

const stripes = () => paint(100, 100, (_x, y) => (y % 10 < 6 ? NAVY : WHITE));
const halves = () => paint(100, 100, (x) => (x < 50 ? NAVY : WHITE));

describe('ReaderPanel', () => {
  it('starts closed, naming the verdict on its toggle', () => {
    renderPanel(solid(NAVY));
    const toggle = screen.getByRole('button', { name: 'Reader · single' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('img', { name: 'Sampled region' })).not.toBeInTheDocument();
  });

  it('opens and closes from the same toggle', async () => {
    const user = renderPanel(solid(NAVY));
    const toggle = screen.getByRole('button', { name: 'Reader · single' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(panel).toBeInTheDocument();
    expect(within(panel!).getByRole('img', { name: 'Sampled region' })).toBeInTheDocument();
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('img', { name: 'Sampled region' })).not.toBeInTheDocument();
  });

  // The pin #115 asks for: what the panel says is what the reader decided,
  // for each kind of verdict and for a region a tap moved.
  it.each([
    ['a plain garment', solid(NAVY), undefined],
    ['stripes', stripes(), undefined],
    ['a busy scene', paint(100, 100, busy), undefined],
    ['a tap on one half', halves(), tapRegion(halves(), 20, 50)],
  ])('shows the verdict readColor returns for %s', async (_name, pixels, tapped) => {
    const region = tapped ?? defaultRegion(pixels);
    const reading = readColor(pixels, region);
    const user = renderPanel(pixels, region);
    await user.click(screen.getByRole('button', { name: `Reader · ${reading.kind}` }));
    expect(screen.getByTestId('reader-verdict')).toHaveTextContent(verdictText(reading));
  });

  it('lists every cluster with its share, largest first', async () => {
    const pixels = stripes();
    const user = renderPanel(pixels);
    await user.click(screen.getByRole('button', { name: /^Reader/ }));
    const rows = within(screen.getByRole('list', { name: 'Clusters' })).getAllByRole('listitem');
    const found = colorsIn(pixels, defaultRegion(pixels));
    expect(rows).toHaveLength(found.length);
    found.forEach(({ color, share }, i) => {
      expect(rows[i]).toHaveTextContent(color);
      expect(rows[i]).toHaveTextContent(share.toFixed(2));
    });
  });

  it('puts the threshold and the lightness under the verdict', async () => {
    const user = renderPanel(solid(NAVY), undefined, true);
    await user.click(screen.getByRole('button', { name: /^Reader/ }));
    expect(screen.getByText(/^largest 1\.00 ≥ single 0\.7$/)).toBeInTheDocument();
    expect(screen.getByText(/dark below 0\.25 · viewfinder dark$/)).toBeInTheDocument();
  });
});
