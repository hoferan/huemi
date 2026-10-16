import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RunProgress } from './RunProgress';

describe('RunProgress', () => {
  it('counts from one and shows the light', () => {
    render(<RunProgress index={3} length={20} light="lamp" />);
    expect(screen.getByText('4 of 20')).toBeInTheDocument();
    expect(screen.getByText('Lamp')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '4');
    expect(bar).toHaveAttribute('aria-valuemax', '20');
  });

  it('shows no light for a run without one', () => {
    render(<RunProgress index={0} length={10} light={null} />);
    expect(screen.getByText('1 of 10')).toBeInTheDocument();
    expect(screen.queryByText('Lamp')).not.toBeInTheDocument();
  });
});
