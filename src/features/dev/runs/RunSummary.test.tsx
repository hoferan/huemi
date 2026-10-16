import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RunSummary } from './RunSummary';

describe('RunSummary', () => {
  it('shows the headline and what it was given', () => {
    render(
      <RunSummary
        headline="20 answers"
        exportControl={<button type="button">Export</button>}
        onAgain={vi.fn()}
        onUndo={null}
      >
        <p>Detail</p>
      </RunSummary>,
    );
    expect(screen.getByText('20 answers')).toBeInTheDocument();
    expect(screen.getByText('Detail')).toBeInTheDocument();
  });

  it('has no Undo when there is nothing to undo', () => {
    render(
      <RunSummary
        headline="Done"
        exportControl={<button type="button">Export</button>}
        onAgain={vi.fn()}
        onUndo={null}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
  });

  it('shows the export control it was given, and wires Another run and Undo', async () => {
    const user = userEvent.setup();
    const onAgain = vi.fn();
    const onUndo = vi.fn();
    render(
      <RunSummary
        headline="Done"
        exportControl={<button type="button">Export</button>}
        onAgain={onAgain}
        onUndo={onUndo}
      />,
    );
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Another run' }));
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
  });
});
