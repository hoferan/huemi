import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { NotFound } from './NotFound';

describe('NotFound', () => {
  it('goes back to the start screen', () => {
    render(
      <MemoryRouter initialEntries={['/nowhere']}>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Back to Start with a garment' })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
