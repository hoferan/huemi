import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { DevBadge } from './DevBadge';

describe('DevBadge', () => {
  it('links to the dev menu with the text DEV', () => {
    render(
      <MemoryRouter>
        <DevBadge />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: 'Developer mode' });
    expect(link).toHaveAttribute('href', '/dev');
    expect(link).toHaveTextContent('DEV');
  });
});
