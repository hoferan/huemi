import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { InstallButton } from './InstallButton';
import { installOffer } from './installOffer.testing';

describe('InstallButton', () => {
  it('renders nothing before the browser offers to install', () => {
    const { container } = render(<InstallButton />);
    expect(container).toBeEmptyDOMElement();
  });

  it('appears once the browser offers, and installs on click', async () => {
    render(<InstallButton />);
    const offer = installOffer();
    act(() => void window.dispatchEvent(offer));
    await userEvent.click(screen.getByRole('button', { name: 'Install huemi' }));
    expect(offer.prompt).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Install huemi' })).not.toBeInTheDocument();
  });
});
