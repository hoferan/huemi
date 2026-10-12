import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FULL_SHAPE, type Shape } from '../../model/shape';
import type { Slot } from '../../model/types';
import { REMEMBERED } from './copy';
import { PiecesSheet } from './PiecesSheet';

function show(shape: Shape, baseSlot: Slot, onWornChange = vi.fn()) {
  render(
    <PiecesSheet
      open
      onOpenChange={() => {}}
      shape={shape}
      baseSlot={baseSlot}
      onWornChange={onWornChange}
    />,
  );
  return onWornChange;
}

describe('PiecesSheet', () => {
  it('offers a switch for each piece that can be left out', () => {
    show(FULL_SHAPE, 'top');
    expect(screen.getByRole('dialog', { name: 'Pieces' })).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: 'Outerwear' })).toBeChecked();
    expect(screen.getByRole('switch', { name: 'Accessory' })).toBeChecked();
    expect(screen.getByText(REMEMBERED)).toBeInTheDocument();
  });

  it('says shoes are always worn rather than offering to leave them out', () => {
    show(FULL_SHAPE, 'top');
    expect(screen.queryByRole('switch', { name: 'Shoes' })).not.toBeInTheDocument();
    const shoes = screen.getByText('Shoes').closest('li')!;
    expect(within(shoes).getByText('Always')).toBeInTheDocument();
  });

  it('shows a piece left out as switched off', () => {
    show({ outerwear: true, accessory: false }, 'top');
    expect(screen.getByRole('switch', { name: 'Accessory' })).not.toBeChecked();
  });

  it('says why the base cannot be left out instead of disabling it', () => {
    show(FULL_SHAPE, 'outerwear');
    expect(screen.queryByRole('switch', { name: 'Outerwear' })).not.toBeInTheDocument();
    const outerwear = screen.getByText('Outerwear').closest('li')!;
    expect(within(outerwear).getByText('Always')).toBeInTheDocument();
    expect(within(outerwear).getByText('Your base is outerwear.')).toBeInTheDocument();
  });

  it('reports a switch flipped', async () => {
    const user = userEvent.setup();
    const onWornChange = show(FULL_SHAPE, 'top');
    await user.click(screen.getByRole('switch', { name: 'Accessory' }));
    expect(onWornChange).toHaveBeenCalledWith('accessory', false);
  });
});
