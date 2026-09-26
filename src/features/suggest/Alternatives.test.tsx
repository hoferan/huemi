import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { suggest } from '../../color/engine';
import { parseHex } from '../../model/hex';
import { Alternatives } from './Alternatives';

const list = suggest(parseHex('#c39a3a'), 'shoes', 'top');

describe('Alternatives', () => {
  it('lists every option it is given, so the position label stays true', () => {
    render(<Alternatives options={list} current={list[0]!.hex} onChoose={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(list.length);
  });

  it('marks the one showing', () => {
    render(<Alternatives options={list} current={list[2]!.hex} onChoose={vi.fn()} />);
    expect(screen.getByRole('button', { name: new RegExp(list[2]!.name) })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('marks nothing when nothing in the list is showing', () => {
    render(<Alternatives options={list} current={null} onChoose={vi.fn()} />);
    for (const button of screen.getAllByRole('button')) {
      expect(button).not.toHaveAttribute('aria-current');
    }
  });

  it('reports the colour and where it sits in the list', async () => {
    const user = userEvent.setup();
    const onChoose = vi.fn();
    render(<Alternatives options={list} current={list[0]!.hex} onChoose={onChoose} />);
    await user.click(screen.getByRole('button', { name: `${list[3]!.name}, 4 of ${list.length}` }));
    expect(onChoose).toHaveBeenCalledWith(list[3]!.hex, 3);
  });

  it('puts a lead tile first, outside the count', async () => {
    const user = userEvent.setup();
    const onLead = vi.fn();
    render(
      <Alternatives
        options={list}
        current={null}
        onChoose={vi.fn()}
        lead={{ hex: parseHex('#a4522d'), label: 'Yours, Rust', current: true, onChoose: onLead }}
      />,
    );
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(list.length + 1);
    expect(buttons[0]).toHaveAccessibleName('Yours, Rust');
    expect(buttons[0]).toHaveAttribute('aria-current', 'true');
    expect(buttons[1]).toHaveAccessibleName(`${list[0]!.name}, 1 of ${list.length}`);
    await user.click(buttons[0]!);
    expect(onLead).toHaveBeenCalledTimes(1);
  });
});
