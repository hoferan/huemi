import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FULL_SHAPE, type Shape } from '../../model/shape';
import type { Slot } from '../../model/types';
import { REMEMBERED } from './copy';
import { PiecesSheet } from './PiecesSheet';

function show(shape: Shape, baseSlot: Slot, onWornChange = vi.fn(), onDressChange = vi.fn()) {
  render(
    <PiecesSheet
      open
      onOpenChange={() => {}}
      shape={shape}
      baseSlot={baseSlot}
      onWornChange={onWornChange}
      onDressChange={onDressChange}
    />,
  );
  return { onWornChange, onDressChange };
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
    show({ outerwear: true, accessory: false, dress: false }, 'top');
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
    const { onWornChange } = show(FULL_SHAPE, 'top');
    await user.click(screen.getByRole('switch', { name: 'Accessory' }));
    expect(onWornChange).toHaveBeenCalledWith('accessory', false);
  });

  describe('top and bottom, or a dress', () => {
    it('offers the choice where the top and the bottom sit, head to toe', () => {
      show(FULL_SHAPE, 'shoes');
      const group = screen.getByRole('radiogroup', { name: 'Top and bottom, or a dress' });
      expect(within(group).getByRole('radio', { name: 'Top and bottom' })).toBeChecked();
      expect(within(group).getByRole('radio', { name: 'Dress' })).not.toBeChecked();
      const rows = screen.getAllByRole('listitem').map((row) => row.textContent);
      expect(rows[0]).toMatch(/^Outerwear/);
      expect(rows[1]).toMatch(/^Top and bottom/);
      expect(rows[2]).toMatch(/^Shoes/);
    });

    it('shows a dress chosen', () => {
      show({ ...FULL_SHAPE, dress: true }, 'shoes');
      expect(screen.getByRole('radio', { name: 'Dress' })).toBeChecked();
    });

    it('reports the choice', async () => {
      const user = userEvent.setup();
      const { onDressChange } = show(FULL_SHAPE, 'accessory');
      await user.click(screen.getByRole('radio', { name: 'Dress' }));
      expect(onDressChange).toHaveBeenCalledWith(true);
    });

    it('says a top base needs a bottom instead of offering a dress', () => {
      show(FULL_SHAPE, 'top');
      expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument();
      const row = screen.getByText('Top and bottom').closest('li')!;
      expect(within(row).getByText('Always')).toBeInTheDocument();
      expect(within(row).getByText('Your base is a top.')).toBeInTheDocument();
    });

    it('says the same for a bottom base', () => {
      show(FULL_SHAPE, 'bottom');
      const row = screen.getByText('Top and bottom').closest('li')!;
      expect(within(row).getByText('Your base is a bottom.')).toBeInTheDocument();
    });

    it('says a dress base is the dress', () => {
      show({ ...FULL_SHAPE, dress: true }, 'dress');
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
      expect(screen.queryByText('Top and bottom')).not.toBeInTheDocument();
      const row = screen.getByText('Dress').closest('li')!;
      expect(within(row).getByText('Always')).toBeInTheDocument();
      expect(within(row).getByText('Your base is a dress.')).toBeInTheDocument();
    });
  });
});
