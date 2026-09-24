import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAVY, solid } from '../../color/testing';
import { FramePhoto } from './FramePhoto';

// A stand-in for the DOM's own ImageData, which jsdom does not implement.
// Real enough for putImageData to receive the same width, height and bytes a
// browser would pass it.
class FakeImageData {
  constructor(
    public data: Uint8ClampedArray,
    public width: number,
    public height: number,
  ) {}
}

describe('FramePhoto', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders as an image named for what it is, even with no 2D context', () => {
    // jsdom returns null from getContext('2d'); the photo must still be there.
    render(<FramePhoto pixels={solid(NAVY, 4)} />);
    expect(screen.getByRole('img', { name: 'Your photo' })).toBeInTheDocument();
  });

  it('draws the pixels onto the canvas when a 2D context is there to draw with', () => {
    const putImageData = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      putImageData,
    } as unknown as CanvasRenderingContext2D);
    vi.stubGlobal('ImageData', FakeImageData);
    const pixels = solid(NAVY, 2);
    render(<FramePhoto pixels={pixels} />);
    expect(putImageData).toHaveBeenCalledOnce();
    const drawn = putImageData.mock.calls[0]![0] as FakeImageData;
    expect(drawn.width).toBe(2);
    expect(drawn.height).toBe(2);
    expect(Array.from(drawn.data)).toEqual(Array.from(pixels.data));
  });

  it('draws nothing when the context is there but jsdom still has no ImageData', () => {
    const putImageData = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      putImageData,
    } as unknown as CanvasRenderingContext2D);
    render(<FramePhoto pixels={solid(NAVY, 2)} />);
    expect(putImageData).not.toHaveBeenCalled();
  });

  it('re-measures the box on a resize, so a mark set before it can still place itself', () => {
    render(<FramePhoto pixels={solid(NAVY, 100)} mark={{ x: 50, y: 50 }} />);
    // jsdom lays nothing out, so the box is still zero-sized right after mount.
    expect(screen.queryByTestId('tap-mark')).not.toBeInTheDocument();
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 }) as DOMRect;
    fireEvent(window, new Event('resize'));
    expect(screen.getByTestId('tap-mark')).toBeInTheDocument();
  });

  it('reports a tap in frame pixels', () => {
    const onTap = vi.fn();
    render(<FramePhoto pixels={solid(NAVY, 100)} onTap={onTap} />);
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 200 }) as DOMRect;
    fireEvent.click(photo, { clientX: 50, clientY: 150 });
    expect(onTap).toHaveBeenCalledWith(25, 75);
  });

  it('ignores a tap before the photo has a size', () => {
    const onTap = vi.fn();
    render(<FramePhoto pixels={solid(NAVY, 100)} onTap={onTap} />);
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0 }) as DOMRect;
    fireEvent.click(photo, { clientX: 0, clientY: 0 });
    expect(onTap).not.toHaveBeenCalled();
  });

  // A portrait box holding a square frame: cover crops the sides to fill it
  // (scale 2, 50px cropped off each side), contain does not (scale 1, bars
  // above and below instead). The two fits only disagree because the box
  // isn't the same shape as the frame, so this is also what a real confirm
  // screen's tall photo box does to a landscape camera frame.
  it('reports an uncropped tap under contain, unlike cover', () => {
    const onTap = vi.fn();
    render(<FramePhoto pixels={solid(NAVY, 100)} onTap={onTap} fit="contain" />);
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 200 }) as DOMRect;
    fireEvent.click(photo, { clientX: 0, clientY: 100 });
    expect(onTap).toHaveBeenCalledWith(0, 50);
  });

  it('ignores a tap that lands in the contain letterbox bar', () => {
    const onTap = vi.fn();
    render(<FramePhoto pixels={solid(NAVY, 100)} onTap={onTap} fit="contain" />);
    const photo = screen.getByRole('img', { name: 'Your photo' });
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 200 }) as DOMRect;
    fireEvent.click(photo, { clientX: 50, clientY: 10 });
    expect(onTap).not.toHaveBeenCalled();
  });
});
