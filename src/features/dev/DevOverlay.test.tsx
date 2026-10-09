import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DevOverlay } from './DevOverlay';

function renderOverlay() {
  render(
    <DevOverlay label="Engine">
      <p>Inside</p>
    </DevOverlay>,
  );
  return userEvent.setup();
}

describe('DevOverlay', () => {
  it('starts closed with its label on the toggle', () => {
    renderOverlay();
    const toggle = screen.getByRole('button', { name: 'Engine' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  it('opens a panel holding its children, and closes it from the same toggle', async () => {
    const user = renderOverlay();
    const toggle = screen.getByRole('button', { name: 'Engine' });
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const panel = document.getElementById(toggle.getAttribute('aria-controls')!);
    expect(panel).toContainElement(screen.getByText('Inside'));
    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Inside')).not.toBeInTheDocument();
  });

  // The panel scrolls when its contents outgrow it, and a scrolling region has
  // to be reachable from the keyboard (axe's scrollable-region-focusable).
  it('makes the open panel a named region the keyboard can reach', async () => {
    const user = renderOverlay();
    await user.click(screen.getByRole('button', { name: 'Engine' }));
    const panel = screen.getByRole('region', { name: 'Engine' });
    expect(panel).toHaveAttribute('tabindex', '0');
    expect(panel).toContainElement(screen.getByText('Inside'));
  });
});
