import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Root } from './Root';

describe('Root', () => {
  it('renders the routed app with a live region above it', () => {
    render(<Root />);
    expect(screen.getByRole('heading', { level: 1, name: 'huemi' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
