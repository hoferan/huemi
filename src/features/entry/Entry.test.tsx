import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DevModeProvider } from '../dev/DevModeProvider';
import { DevSlotHost } from '../dev/DevSlotHost';
import { fakeDevModeStore } from '../dev/testing';
import { InitialLocationContext } from '../../ui/InitialLocationContext';
import { installOffer } from '../install/installOffer.testing';
import { Entry } from './Entry';

function SlotProbe() {
  return <p data-testid="slot-search">{useLocation().search}</p>;
}

function renderAt() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <InitialLocationContext value={true}>
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/slot" element={<SlotProbe />} />
          <Route path="/saved" element={<p>saved screen</p>} />
          <Route path="/check" element={<p>outfit camera</p>} />
        </Routes>
      </InitialLocationContext>
    </MemoryRouter>,
  );
}

describe('Entry', () => {
  it('leads with what to do', () => {
    renderAt();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Start with a garment' }),
    ).toBeInTheDocument();
  });

  it('shows the wordmark above the heading without competing with it', () => {
    renderAt();
    const wordmark = screen.getByText('huemi');
    expect(wordmark.tagName).not.toBe('H1');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  it('shows the developer chip beside the wordmark while developer mode is on', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <InitialLocationContext value={true}>
          <DevModeProvider store={fakeDevModeStore(true)}>
            <DevSlotHost>
              <Routes>
                <Route path="/" element={<Entry />} />
              </Routes>
            </DevSlotHost>
          </DevModeProvider>
        </InitialLocationContext>
      </MemoryRouter>,
    );
    const chip = await screen.findByRole('link', { name: 'Developer mode' });
    expect(chip).toHaveAttribute('href', '/dev');
    expect(
      screen.getByText('huemi').compareDocumentPosition(chip) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('leads with the camera', () => {
    renderAt();
    const [photo, color, check, ...rest] = screen.getAllByRole('button');
    expect(photo).toHaveAccessibleName('Take a photo');
    expect(color).toHaveAccessibleName('Pick a color');
    expect(check).toHaveAccessibleName('Already dressed? Check your outfit');
    expect(rest).toEqual([]);
  });

  // The cards carry the line the start screen's paragraph used to say, as a
  // description, so the button's name stays the two words a user would say.
  it('says what each way in is for', () => {
    renderAt();
    expect(screen.getByRole('button', { name: 'Take a photo' })).toHaveAccessibleDescription(
      'of something you own',
    );
    expect(screen.getByRole('button', { name: 'Pick a color' })).toHaveAccessibleDescription(
      'if you know it',
    );
  });

  it('takes the camera route through slot choice', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Take a photo' }));
    expect(await screen.findByText('?next=camera')).toBeInTheDocument();
  });

  it('starts the color route', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Pick a color' }));
    expect(await screen.findByTestId('slot-search')).toHaveTextContent('');
  });

  it('links to the saved outfits', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('link', { name: 'Saved' }));
    expect(await screen.findByText('saved screen')).toBeInTheDocument();
  });
  it('offers the outfit check to someone already dressed', async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getByRole('button', { name: 'Already dressed? Check your outfit' }));
    expect(await screen.findByText('outfit camera')).toBeInTheDocument();
  });

  it('shows no install link until the browser offers one', () => {
    renderAt();
    expect(screen.queryByRole('button', { name: 'Install huemi' })).not.toBeInTheDocument();
  });

  it('shows the install link below the other buttons once offered', () => {
    renderAt();
    act(() => void window.dispatchEvent(installOffer()));
    const buttons = screen.getAllByRole('button');
    expect(buttons.at(-1)).toHaveAccessibleName('Install huemi');
    expect(buttons).toHaveLength(4);
  });
});
