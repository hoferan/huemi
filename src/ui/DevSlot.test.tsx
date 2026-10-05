import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DevSlot } from './DevSlot';
import { DevSlotContext } from './DevSlotContext';

describe('DevSlot', () => {
  it('renders nothing without a renderer', () => {
    const { container } = render(<DevSlot name="screen.badge" context={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('passes its name and context to the renderer', () => {
    const renderer = vi.fn(() => <p>filled</p>);
    const { getByText } = render(
      <DevSlotContext value={renderer}>
        <DevSlot name="screen.badge" context={{}} />
      </DevSlotContext>,
    );
    expect(renderer).toHaveBeenCalledWith('screen.badge', {});
    expect(getByText('filled')).toBeInTheDocument();
  });
});
