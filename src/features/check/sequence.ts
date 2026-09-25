import type { ColorReading } from '../../color/read';
import type { Hex } from '../../model/hex';

export type TapOutcome = { kind: 'set'; hex: Hex; read?: Hex } | { kind: 'retry' };

/**
 * What a tap on the outfit photo does with its reading.
 *
 * A pattern fills the slot with its largest color instead of asking which
 * one was meant, as the confirm screen does. Here the list that follows shows
 * every piece and lets any of them be changed, so a question at this step
 * would only slow down the three pieces that read fine. That also means a
 * pattern has nothing to correct: it carries no `read`, so picking a
 * different one of its colors later in the list logs no correction, the
 * same rule the confirm screen applies to its own `several` state.
 */
export function tapOutcome(reading: ColorReading): TapOutcome {
  switch (reading.kind) {
    case 'single':
      return { kind: 'set', hex: reading.color, read: reading.color };
    case 'several':
      // `decide` in color/read.ts returns `several` only with two or more
      // colors, largest first.
      return { kind: 'set', hex: reading.colors[0]!.color };
    case 'unclear':
      return { kind: 'retry' };
  }
}
