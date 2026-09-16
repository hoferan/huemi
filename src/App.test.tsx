import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders a colour block for each spike hex with an accessible name', () => {
    render(<App />);
    expect(screen.getByRole('img', { name: 'Navy' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Cream' })).toBeTruthy();
  });
});
