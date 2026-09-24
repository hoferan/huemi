import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NAVY, solid } from '../../color/testing';
import { FramePhoto } from './FramePhoto';

describe('FramePhoto', () => {
  it('renders as an image named for what it is, even with no 2D context', () => {
    // jsdom returns null from getContext('2d'); the photo must still be there.
    render(<FramePhoto pixels={solid(NAVY, 4)} />);
    expect(screen.getByRole('img', { name: 'Your photo' })).toBeInTheDocument();
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
});
