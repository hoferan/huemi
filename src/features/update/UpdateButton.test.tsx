import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeRegistration, fakeWorker } from './registration.testing';
import { UpdateButton } from './UpdateButton';
import { watchForUpdates } from './useUpdateReady';

let stop: (() => void) | undefined;
afterEach(() => act(() => stop?.()));

describe('UpdateButton', () => {
  it('renders nothing while no new version waits', () => {
    stop = watchForUpdates(fakeRegistration({ active: fakeWorker('activated') }));
    const { container } = render(<UpdateButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('appears once a new version waits, and asks it to take over on click', async () => {
    const registration = fakeRegistration({ active: fakeWorker('activated') });
    stop = watchForUpdates(registration, { container: new EventTarget() });
    render(<UpdateButton />);
    const next = fakeWorker('installing');
    act(() => registration.find(next));
    act(() => next.become('installed'));
    await userEvent.click(screen.getByRole('button', { name: 'Update huemi' }));
    expect(next.postMessage).toHaveBeenCalledWith({ type: 'skip-waiting' });
  });
});
