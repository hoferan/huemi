import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router';
import { describe, expect, it } from 'vitest';
import { hslToHex } from '../../../color/convert';
import type { FieldStore, StorageResult } from '../../../storage/port';
import { SessionProvider } from '../../../session/SessionProvider';
import { useSession } from '../../../session/useSession';
import { fakeFieldStore } from './fieldStore.testing';
import { FieldStoreContext } from './FieldStoreContext';
import { NewGarment } from './NewGarment';

function Where() {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <p data-testid="where">{pathname + search}</p>
      <button type="button" onClick={() => void navigate(-1)}>
        browser back
      </button>
    </>
  );
}

function Toast() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function setup(store: FieldStore = fakeFieldStore()) {
  render(
    <FieldStoreContext value={store}>
      <MemoryRouter initialEntries={['/dev/field', '/dev/field/new']} initialIndex={1}>
        <SessionProvider>
          <Routes>
            <Route path="/dev/field/new" element={<NewGarment />} />
            <Route path="*" element={<Where />} />
          </Routes>
          <Toast />
        </SessionProvider>
      </MemoryRouter>
    </FieldStoreContext>,
  );
  return { user: userEvent.setup(), store };
}

function value<T>(result: StorageResult<T>): T {
  if (!result.ok) throw new Error(result.reason);
  return result.value;
}

describe('NewGarment', () => {
  it('saves a one-color garment and opens it', async () => {
    const { user, store } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Label' }), '  Navy coat  ');
    fireEvent.change(screen.getByRole('slider', { name: 'Hue' }), { target: { value: '0' } });
    await user.click(screen.getByRole('button', { name: 'Save garment' }));

    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field\/garment\?id=/),
    );
    const [saved] = value(await store.listGarments());
    expect(saved).toMatchObject({ label: 'Navy coat', truth: [hslToHex(0, 40, 50)] });
    expect(Number.isNaN(Date.parse(saved!.createdAt))).toBe(false);
    expect(screen.getByTestId('where')).toHaveTextContent(`/dev/field/garment?id=${saved!.id}`);

    // Replaced, so Back from the garment goes to the list, not to a blank form.
    await user.click(screen.getByRole('button', { name: 'browser back' }));
    expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field$/);
  });

  it('asks for at least two colors in several mode', async () => {
    const { user, store } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Striped scarf');
    await user.click(screen.getByRole('radio', { name: 'Several colors' }));
    await user.click(screen.getByRole('button', { name: 'Save garment' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Add a second color, or choose One color.');
    expect(value(await store.listGarments())).toEqual([]);

    await user.click(screen.getByRole('button', { name: 'Add a color' }));
    await user.click(screen.getByRole('button', { name: 'Save garment' }));
    await waitFor(async () => expect(value(await store.listGarments())[0]?.truth).toHaveLength(2));
  });

  it('stops adding colors at three', async () => {
    const { user } = setup();
    expect(screen.queryByRole('button', { name: 'Add a color' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: 'Several colors' }));
    await user.click(screen.getByRole('button', { name: 'Add a color' }));
    await user.click(screen.getByRole('button', { name: 'Add a color' }));

    expect(screen.getAllByRole('group', { name: /^Color \d$/ })).toHaveLength(3);
    expect(screen.queryByRole('button', { name: 'Add a color' })).not.toBeInTheDocument();
  });

  it('keeps only the first color in one-color mode', async () => {
    const { user, store } = setup();
    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Navy coat');
    await user.click(screen.getByRole('radio', { name: 'Several colors' }));
    await user.click(screen.getByRole('button', { name: 'Add a color' }));
    await user.click(screen.getByRole('radio', { name: 'One color' }));

    expect(screen.getAllByRole('group', { name: /^Color \d$/ })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: 'Save garment' }));
    await waitFor(async () => expect(value(await store.listGarments())[0]?.truth).toHaveLength(1));
  });

  it('saves once when Save is tapped twice', async () => {
    const inner = fakeFieldStore();
    // Holds every save open until released, so the second tap lands mid-save.
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let saves = 0;
    const store: FieldStore = {
      ...inner,
      saveGarment: async (garment) => {
        saves += 1;
        await held;
        return inner.saveGarment(garment);
      },
    };
    const { user } = setup(store);
    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Navy coat');
    await user.click(screen.getByRole('button', { name: 'Save garment' }));
    await user.click(screen.getByRole('button', { name: 'Save garment' }));
    release();

    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(/^\/dev\/field\/garment\?id=/),
    );
    expect(saves).toBe(1);
    expect(value(await inner.listGarments())).toHaveLength(1);
  });

  it('saves on a second try after a failed save', async () => {
    const inner = fakeFieldStore();
    let failed = false;
    const store: FieldStore = {
      ...inner,
      saveGarment: (garment) => {
        if (failed) return inner.saveGarment(garment);
        failed = true;
        return Promise.resolve({ ok: false, reason: 'quota' });
      },
    };
    const { user } = setup(store);
    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Navy coat');
    await user.click(screen.getByRole('button', { name: 'Save garment' }));
    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't save this garment."),
    );
    await user.click(screen.getByRole('button', { name: 'Save garment' }));

    await waitFor(() => expect(screen.getByTestId('where')).toBeInTheDocument());
    expect(value(await inner.listGarments())).toHaveLength(1);
  });

  it('will not save without a label', async () => {
    const { user, store } = setup();
    const field = screen.getByRole('textbox', { name: 'Label' });
    await user.type(field, '   ');
    await user.click(screen.getByRole('button', { name: 'Save garment' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Give the garment a label.');
    expect(field).toHaveFocus();
    expect(value(await store.listGarments())).toEqual([]);
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
  });

  it('says so when the garment could not be saved', async () => {
    const { user } = setup(fakeFieldStore({ failing: true }));
    await user.type(screen.getByRole('textbox', { name: 'Label' }), 'Navy coat');
    await user.click(screen.getByRole('button', { name: 'Save garment' }));

    await waitFor(() =>
      expect(screen.getByTestId('toast')).toHaveTextContent("Couldn't save this garment."),
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Add garment' })).toBeInTheDocument();
  });
});
