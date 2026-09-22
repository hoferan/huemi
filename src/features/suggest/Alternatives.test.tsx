import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { suggest } from '../../color/engine';
import { parseHex } from '../../model/hex';
import type { Base } from '../../session/types';
import { Alternatives } from './Alternatives';

const base: Base = { slot: 'top', hex: parseHex('#c39a3a') };
const list = suggest(base.hex, 'shoes', base.slot);

describe('Alternatives', () => {
  it('lists the whole ranked list, so the position label stays true', () => {
    render(<Alternatives base={base} slot="shoes" current={list[0]!.hex} onChoose={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(list.length);
  });

  it('marks the one showing', () => {
    render(<Alternatives base={base} slot="shoes" current={list[2]!.hex} onChoose={vi.fn()} />);
    expect(screen.getByRole('button', { name: new RegExp(list[2]!.name) })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('reports the colour and where it sits in the list', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<Alternatives base={base} slot="shoes" current={list[0]!.hex} onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: new RegExp(list[3]!.name) }));
    expect(onChoose).toHaveBeenCalledWith(list[3]!.hex, 3);
  });
});
