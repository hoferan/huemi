import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { parseHex } from '../../model/hex';
import { SessionProvider } from '../../session/SessionProvider';
import { useSession } from '../../session/useSession';
import { fakeSharePort, type FakeSharePort } from './fakeShare.testing';
import { layoutShareImage, type ShareImageInput } from './layout';
import { shareLink } from './link';
import type { ShareResult } from './port';
import { ShareButton } from './ShareButton';
import { ShareContext } from './ShareContext';
import { shareText } from './shareText';

const NAVY_TOP: ShareImageInput = { pieces: { top: parseHex('#1f2a44') }, baseSlot: 'top' };
const WHITE_TOP: ShareImageInput = { pieces: { top: parseHex('#ffffff') }, baseSlot: 'top' };

/** The toast is rendered by the shell, which a feature test may not import. */
function ToastText() {
  const { state } = useSession();
  return <p data-testid="toast">{state.toast?.message ?? ''}</p>;
}

function tree(port: FakeSharePort, input: ShareImageInput) {
  return (
    <ShareContext value={port}>
      <SessionProvider>
        <ShareButton {...input} />
        <ToastText />
      </SessionProvider>
    </ShareContext>
  );
}

/** Settles a promise the test was holding open, and what it set off. */
async function settle(release: () => void) {
  await act(() => {
    release();
    return Promise.resolve();
  });
}

/** Renders, then waits for the image the button makes before any tap. */
async function setup(port: FakeSharePort = fakeSharePort(), input = NAVY_TOP) {
  const view = render(tree(port, input));
  await waitFor(() => expect(port.calls.render).toHaveLength(1));
  // Lets the render's promise settle into the button's state.
  await act(() => Promise.resolve());
  return {
    port,
    button: () => screen.getByRole('button', { name: 'Share outfit' }),
    toast: () => screen.getByTestId('toast'),
    rerender: (next: ShareImageInput) => view.rerender(tree(port, next)),
  };
}

describe('ShareButton', () => {
  it('is a button named Share outfit', async () => {
    const { button } = await setup();
    expect(button()).toHaveAttribute('type', 'button');
  });

  it('renders the image for the outfit before any tap', async () => {
    const { port } = await setup();
    expect(port.calls.render[0]).toEqual(layoutShareImage(NAVY_TOP));
    expect(port.calls.share).toHaveLength(0);
  });

  it('shares without awaiting when the image is ready', async () => {
    const files: File[] = [];
    const port = fakeSharePort({
      render: () => {
        const file = new File([''], 'huemi-outfit.png', { type: 'image/png' });
        files.push(file);
        return Promise.resolve(file);
      },
    });
    const { button } = await setup(port);

    fireEvent.click(button());

    expect(port.calls.share).toHaveLength(1);
    expect(port.calls.share[0]).toMatchObject({
      files: [files[0]],
      text: `Navy top. ${shareLink(window.location.origin, NAVY_TOP)}`,
    });
    await act(() => Promise.resolve());
  });

  it('shares the outfit on screen after it changes', async () => {
    const files: File[] = [];
    const port = fakeSharePort({
      render: () => {
        const file = new File([''], 'huemi-outfit.png', { type: 'image/png' });
        files.push(file);
        return Promise.resolve(file);
      },
    });
    const { button, rerender } = await setup(port);

    rerender(WHITE_TOP);
    await waitFor(() => expect(port.calls.render).toHaveLength(2));
    await act(() => Promise.resolve());
    fireEvent.click(button());

    expect(port.calls.render[1]).toEqual(layoutShareImage(WHITE_TOP));
    expect(port.calls.share[0]).toMatchObject({
      files: [files[1]],
      text: `${shareText(WHITE_TOP.pieces)} ${shareLink(window.location.origin, WHITE_TOP)}`,
    });
    await act(() => Promise.resolve());
  });

  it('does not render again for an equal outfit', async () => {
    const { port, rerender } = await setup();

    rerender({ pieces: { top: parseHex('#1f2a44') }, baseSlot: 'top' });
    await act(() => Promise.resolve());

    expect(port.calls.render).toHaveLength(1);
  });

  it('ignores a tap while a share is open', async () => {
    let finish: (result: ShareResult) => void = () => undefined;
    const port = fakeSharePort({
      share: () => new Promise<ShareResult>((resolve) => (finish = resolve)),
    });
    const { button } = await setup(port);

    fireEvent.click(button());
    fireEvent.click(button());
    expect(port.calls.share).toHaveLength(1);

    await settle(() => finish('shared'));
    fireEvent.click(button());
    expect(port.calls.share).toHaveLength(2);
    await settle(() => finish('shared'));
  });

  it('shares a link to the outfit on screen', async () => {
    const { port, button } = await setup();

    fireEvent.click(button());

    const link = shareLink(window.location.origin, NAVY_TOP);
    expect(port.calls.share[0]).toMatchObject({ url: link, text: `Navy top. ${link}` });
    await act(() => Promise.resolve());
  });

  it('says the image was saved and the link copied', async () => {
    const { button, toast } = await setup(
      fakeSharePort({ canShareFiles: () => false, canShare: () => false }),
    );

    fireEvent.click(button());

    await waitFor(() => expect(toast()).toHaveTextContent('Image saved, link copied'));
  });

  it('says the image was saved when it downloads instead', async () => {
    const { button, toast } = await setup(
      fakeSharePort({
        canShareFiles: () => false,
        canShare: () => false,
        copy: () => Promise.resolve(false),
      }),
    );

    fireEvent.click(button());

    await waitFor(() => expect(toast()).toHaveTextContent('Image saved'));
  });

  it('says so when the share fails', async () => {
    const { button, toast } = await setup(
      fakeSharePort({ share: () => Promise.resolve('failed') }),
    );

    fireEvent.click(button());

    await waitFor(() => expect(toast()).toHaveTextContent("Couldn't share this outfit."));
  });

  it('says nothing when the sheet is dismissed', async () => {
    const { port, button, toast } = await setup(
      fakeSharePort({ share: () => Promise.resolve('dismissed') }),
    );

    fireEvent.click(button());
    await act(() => Promise.resolve());

    expect(port.calls.share).toHaveLength(1);
    expect(toast()).toHaveTextContent('');
  });

  it('says so when the image could not be made', async () => {
    const { port, button, toast } = await setup(
      fakeSharePort({ render: () => Promise.resolve(null) }),
    );

    fireEvent.click(button());

    await waitFor(() => expect(toast()).toHaveTextContent("Couldn't share this outfit."));
    expect(port.calls.share).toHaveLength(0);
  });

  // jsdom has no document.fonts, so the real painter throws under any test
  // that renders a screen without a fake port. A device can throw too.
  it('treats a painter that throws as an image that could not be made', async () => {
    const { button, toast } = await setup(
      fakeSharePort({ render: () => Promise.reject(new Error('no canvas')) }),
    );

    fireEvent.click(button());

    await waitFor(() => expect(toast()).toHaveTextContent("Couldn't share this outfit."));
  });

  it('recovers when the device throws instead of answering', async () => {
    let throws = true;
    const port = fakeSharePort({
      canShareFiles: () => {
        if (throws) throw new TypeError('canShare');
        return true;
      },
    });
    const { button, toast } = await setup(port);

    fireEvent.click(button());
    await waitFor(() => expect(toast()).toHaveTextContent("Couldn't share this outfit."));

    throws = false;
    fireEvent.click(button());
    expect(port.calls.share).toHaveLength(1);
    await act(() => Promise.resolve());
  });

  it('waits for an image still being made, then shares it', async () => {
    let finish: (file: File | null) => void = () => undefined;
    const file = new File([''], 'huemi-outfit.png', { type: 'image/png' });
    const port = fakeSharePort({
      render: () => new Promise<File | null>((resolve) => (finish = resolve)),
    });
    render(tree(port, NAVY_TOP));
    await waitFor(() => expect(port.calls.render).toHaveLength(1));

    fireEvent.click(screen.getByRole('button', { name: 'Share outfit' }));
    expect(port.calls.share).toHaveLength(0);
    await settle(() => finish(file));

    await waitFor(() => expect(port.calls.share).toHaveLength(1));
    expect(port.calls.share[0]).toMatchObject({ files: [file] });
  });
});
