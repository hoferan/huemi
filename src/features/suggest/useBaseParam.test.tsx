import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { useBaseParam } from './useBaseParam';

function Probe() {
  const base = useBaseParam();
  return <p>{base ? `${base.slot} ${base.hex}` : 'none'}</p>;
}

function at(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Probe />
    </MemoryRouter>,
  );
}

describe('useBaseParam', () => {
  it('reads a slot and a hex', () => {
    at('/suggest?slot=top&hex=%23a3231f');
    expect(screen.getByText('top #a3231f')).toBeInTheDocument();
  });

  // A person typing the URL, or a client re-encoding it, produces forms
  // parseHex accepts and isHex does not. Bouncing those to the entry screen
  // would be a redirect the user cannot explain.
  it('accepts an uppercase hex and canonicalises it', () => {
    at('/suggest?slot=top&hex=%23A3231F');
    expect(screen.getByText('top #a3231f')).toBeInTheDocument();
  });

  it('accepts a three-digit hex and expands it', () => {
    at('/suggest?slot=shoes&hex=%23abc');
    expect(screen.getByText('shoes #aabbcc')).toBeInTheDocument();
  });

  it('rejects a slot the model does not know', () => {
    at('/suggest?slot=hat&hex=%23a3231f');
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('rejects a hex that is not a colour', () => {
    at('/suggest?slot=top&hex=rust');
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('rejects a missing hex', () => {
    at('/suggest?slot=top');
    expect(screen.getByText('none')).toBeInTheDocument();
  });

  it('rejects both missing', () => {
    at('/suggest');
    expect(screen.getByText('none')).toBeInTheDocument();
  });
});
