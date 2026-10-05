import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { SessionProvider } from '../../session/SessionProvider';
import { charMeasure, fakeSharePort, type FakeSharePort } from './fakeShare.testing';
import { layoutShareImage, type ShareImage } from './layout';
import { ShareContext } from './ShareContext';
import { useShareOutfit } from './useShareOutfit';

const NAVY_TOP: ShareImage = { pieces: { top: parseHex('#1f2a44') }, baseSlot: 'top' };

function Probe({ image, when }: { image: ShareImage; when: 'now' | 'onIntent' }) {
  const { share, prepare } = useShareOutfit(image, when);
  return (
    <>
      <button type="button" onClick={share}>
        share
      </button>
      <button type="button" onClick={prepare}>
        prepare
      </button>
    </>
  );
}

const press = (name: 'share' | 'prepare') => fireEvent.click(screen.getByRole('button', { name }));

function tree(port: FakeSharePort, image: ShareImage, when: 'now' | 'onIntent') {
  return (
    <ShareContext value={port}>
      <SessionProvider>
        <Probe image={image} when={when} />
      </SessionProvider>
    </ShareContext>
  );
}

describe('useShareOutfit', () => {
  it('paints at once when asked to share now', async () => {
    const port = fakeSharePort();
    render(tree(port, NAVY_TOP, 'now'));

    await waitFor(() => expect(port.calls.render).toHaveLength(1));
    expect(port.calls.render[0]).toEqual(layoutShareImage(NAVY_TOP, charMeasure));
  });

  it('paints nothing until prepared when asked to wait for intent', async () => {
    const port = fakeSharePort();
    render(tree(port, NAVY_TOP, 'onIntent'));
    await act(async () => {});
    expect(port.calls.render).toHaveLength(0);

    press('prepare');
    press('prepare');

    await waitFor(() => expect(port.calls.render).toHaveLength(1));
  });

  it('paints and then shares when shared before it was prepared', async () => {
    const port = fakeSharePort();
    render(tree(port, NAVY_TOP, 'onIntent'));
    await act(async () => {});

    press('share');

    await waitFor(() => expect(port.calls.share).toHaveLength(1));
    expect(port.calls.render).toHaveLength(1);
  });

  it('paints again when the sentences change', async () => {
    const port = fakeSharePort();
    const view = render(tree(port, { ...NAVY_TOP, sentences: ['One.'] }, 'now'));
    await waitFor(() => expect(port.calls.render).toHaveLength(1));

    view.rerender(tree(port, { ...NAVY_TOP, sentences: ['Two.'] }, 'now'));

    await waitFor(() => expect(port.calls.render).toHaveLength(2));
  });

  it('stays silent when unmounted before its picture is ready', async () => {
    let finish: (file: File | null) => void = () => undefined;
    const port = fakeSharePort({
      render: () => new Promise<File | null>((resolve) => (finish = resolve)),
    });
    const view = render(tree(port, NAVY_TOP, 'onIntent'));
    press('share');

    view.unmount();
    await act(() => {
      finish(new File([''], 'huemi-outfit.png', { type: 'image/png' }));
      return Promise.resolve();
    });

    expect(port.calls.share).toHaveLength(0);
  });
});
