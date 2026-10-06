import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorSliders } from './ColorSliders';

const HSL = { hue: 210, saturation: 40, lightness: 50 };

describe('ColorSliders', () => {
  it("reports each slider's change as a new hsl", () => {
    const onChange = vi.fn();
    render(<ColorSliders hsl={HSL} onChange={onChange} idPrefix="a-" />);

    fireEvent.change(screen.getByRole('slider', { name: 'Hue' }), { target: { value: '12' } });
    expect(onChange).toHaveBeenLastCalledWith({ ...HSL, hue: 12 });

    fireEvent.change(screen.getByRole('slider', { name: 'Saturation' }), {
      target: { value: '70' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...HSL, saturation: 70 });

    fireEvent.change(screen.getByRole('slider', { name: 'Lightness' }), {
      target: { value: '20' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ ...HSL, lightness: 20 });
  });

  it('prefixes its ids so two sets can share a screen', () => {
    render(
      <>
        <ColorSliders hsl={HSL} onChange={() => {}} idPrefix="a-" />
        <ColorSliders hsl={HSL} onChange={() => {}} idPrefix="b-" />
      </>,
    );
    const hues = screen.getAllByRole('slider', { name: 'Hue' });
    expect(hues.map((slider) => slider.id)).toEqual(['a-hue', 'b-hue']);
  });
});
