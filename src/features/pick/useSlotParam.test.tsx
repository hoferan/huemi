import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useSlotParam } from './useSlotParam';

function Probe() {
  const slot = useSlotParam();
  return <p>{slot ?? 'none'}</p>;
}

function at(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Probe />
    </MemoryRouter>,
  );
}

describe('useSlotParam', () => {
  it('reads a slot the model knows', () => {
    at('/color?slot=top');
    expect(screen.getByText('top')).toBeInTheDocument();
  });

  it('rejects a value that is not a slot', () => {
    at('/color?slot=hat');
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('rejects a missing parameter', () => {
    at('/color');
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
