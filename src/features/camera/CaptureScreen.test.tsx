import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { Frame } from '../../model/frame';
import { Announcer } from '../../ui/Announcer';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { CameraContext } from './CameraContext';
import { CaptureScreen } from './CaptureScreen';
import type { CaptureCopy } from './copy';
import type { CameraPort } from './port';

const frame: Frame = {
  pixels: { width: 1, height: 1, data: new Uint8ClampedArray([200, 200, 200, 255]) },
  source: 'camera',
};

const copy: CaptureCopy = {
  panels: {
    denied: { heading: 'Denied heading', body: 'Denied body' },
    unavailable: { heading: 'Unavailable heading', body: 'Unavailable body' },
    failed: { heading: 'Failed heading', body: 'Failed body' },
  },
  handEntry: 'Do it by hand',
};

function port(overrides: Partial<CameraPort> = {}): CameraPort {
  const stream = { getTracks: () => [{ stop: vi.fn() }] } as unknown as MediaStream;
  return {
    open: vi.fn(() => Promise.resolve({ ok: true as const, stream })),
    attach: vi.fn(),
    readFrame: vi.fn(() => frame),
    readPhoto: vi.fn(() => Promise.resolve({ ok: true as const, frame })),
    ...overrides,
  };
}

function renderWith(camera: CameraPort, onFrame = vi.fn()) {
  render(
    <MemoryRouter>
      <Announcer>
        <InitialLocationContext value={true}>
          <CameraContext value={camera}>
            <CaptureScreen
              title="A title"
              guide="outfit"
              copy={copy}
              handEntry="/by-hand"
              onFrame={onFrame}
            />
          </CameraContext>
        </InitialLocationContext>
      </Announcer>
    </MemoryRouter>,
  );
  return onFrame;
}

describe('CaptureScreen', () => {
  it('hands the frame to its caller', async () => {
    const user = userEvent.setup();
    const onFrame = renderWith(port());
    await user.click(await screen.findByRole('button', { name: 'Take photo' }));
    expect(onFrame).toHaveBeenCalledWith(frame);
    expect(screen.getByRole('heading', { level: 1, name: 'A title' })).toBeInTheDocument();
  });

  it('uses the copy and the hand-entry destination it was given', async () => {
    renderWith(
      port({
        open: vi.fn(() => Promise.resolve({ ok: false as const, reason: 'denied' as const })),
      }),
    );
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Denied heading' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Denied body')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Do it by hand' })).toHaveAttribute('href', '/by-hand');
  });

  it('keeps the hand-entry link out of the live state unless asked', async () => {
    renderWith(port());
    await screen.findByRole('button', { name: 'Take photo' });
    expect(screen.queryByRole('link', { name: 'Do it by hand' })).not.toBeInTheDocument();
  });

  it('offers hand entry beside the shutter when asked to', async () => {
    render(
      <MemoryRouter>
        <Announcer>
          <InitialLocationContext value={true}>
            <CameraContext value={port()}>
              <CaptureScreen
                title="A title"
                guide="outfit"
                copy={copy}
                handEntry="/by-hand"
                alwaysOfferHandEntry
                onFrame={vi.fn()}
              />
            </CameraContext>
          </InitialLocationContext>
        </Announcer>
      </MemoryRouter>,
    );
    await screen.findByRole('button', { name: 'Take photo' });
    expect(screen.getByRole('link', { name: 'Do it by hand' })).toHaveAttribute('href', '/by-hand');
  });

  it('hands a chosen photo on the same way', async () => {
    const onFrame = renderWith(port());
    await screen.findByRole('button', { name: 'Take photo' });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['x'], 'outfit.jpg')] },
    });
    await vi.waitFor(() => expect(onFrame).toHaveBeenCalledWith(frame));
  });
});
