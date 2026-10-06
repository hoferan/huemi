import { lazy } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DevModeProvider } from './DevModeProvider';
import { DevOnly } from './DevOnly';
import { fakeDevModeStore } from './testing';

// A chunk that fails to load, as one does offline before the worker has it.
const Broken = lazy(() => Promise.reject(new Error('Failed to fetch screen chunk')));

function renderAt(url: string, on: boolean, child = <h1>The screen</h1>) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <DevModeProvider store={fakeDevModeStore(on)}>
        <DevOnly>{child}</DevOnly>
      </DevModeProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  // React logs the caught error; the assertions below are what prove the catch.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DevOnly', () => {
  it('renders not found while off', () => {
    renderAt('/dev/field', false);
    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'The screen' })).not.toBeInTheDocument();
  });

  it('renders its children while on', () => {
    renderAt('/dev/field', true);
    expect(screen.getByRole('heading', { name: 'The screen' })).toBeInTheDocument();
  });

  // Rendering at all proves the catch: an uncaught rejection would throw out
  // of render() here, as it would reach the app's boundary in the app.
  it('contains a failed lazy child', async () => {
    renderAt('/dev/field/garment?id=g1', true, <Broken />);
    expect(await screen.findByRole('heading', { name: 'Developer mode' })).toBeInTheDocument();
    expect(screen.getByText("This developer screen didn't load.")).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reload' })).toHaveAttribute(
      'href',
      '/dev/field/garment?id=g1',
    );
  });

  it('recovers on the next developer route after a failure', async () => {
    function Go() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => void navigate('/dev/field/new')}>
          go
        </button>
      );
    }
    render(
      <MemoryRouter initialEntries={['/dev/field']}>
        <DevModeProvider store={fakeDevModeStore(true)}>
          <Routes>
            <Route
              path="/dev/field"
              element={
                <DevOnly>
                  <Broken />
                </DevOnly>
              }
            />
            <Route
              path="/dev/field/new"
              element={
                <DevOnly>
                  <h1>The next screen</h1>
                </DevOnly>
              }
            />
          </Routes>
          <Go />
        </DevModeProvider>
      </MemoryRouter>,
    );
    await screen.findByText("This developer screen didn't load.");
    await userEvent.click(screen.getByRole('button', { name: 'go' }));
    expect(await screen.findByRole('heading', { name: 'The next screen' })).toBeInTheDocument();
  });
});
