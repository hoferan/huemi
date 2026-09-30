import { describe, expect, it } from 'vitest';
import { advanceTrail, startTrail, stepsBackTo } from './historyTrail';

const entry = (key: string, href: string) => ({ key, href });

describe('advanceTrail', () => {
  it('adds a pushed entry after the current one', () => {
    const trail = advanceTrail(startTrail(entry('a', '/')), entry('b', '/slot'), 'PUSH');
    expect(trail.entries.map((e) => e.href)).toEqual(['/', '/slot']);
    expect(trail.index).toBe(1);
  });

  // A push after going back drops the entries ahead, as the browser does.
  it('drops the forward entries when pushing from the middle', () => {
    let trail = startTrail(entry('a', '/'));
    trail = advanceTrail(trail, entry('b', '/slot'), 'PUSH');
    trail = advanceTrail(trail, entry('a', '/'), 'POP');
    trail = advanceTrail(trail, entry('c', '/check'), 'PUSH');
    expect(trail.entries.map((e) => e.href)).toEqual(['/', '/check']);
    expect(trail.index).toBe(1);
  });

  it('overwrites the current entry on a replace', () => {
    let trail = startTrail(entry('a', '/'));
    trail = advanceTrail(trail, entry('b', '/color'), 'PUSH');
    trail = advanceTrail(trail, entry('c', '/slot'), 'REPLACE');
    expect(trail.entries.map((e) => e.href)).toEqual(['/', '/slot']);
    expect(trail.index).toBe(1);
  });

  it('moves to a known entry on a pop, backwards or forwards', () => {
    let trail = startTrail(entry('a', '/'));
    trail = advanceTrail(trail, entry('b', '/slot'), 'PUSH');
    trail = advanceTrail(trail, entry('a', '/'), 'POP');
    expect(trail.index).toBe(0);
    trail = advanceTrail(trail, entry('b', '/slot'), 'POP');
    expect(trail.index).toBe(1);
    expect(trail.entries).toHaveLength(2);
  });

  // After a reload the entries behind the page exist in the browser but not
  // here. Popping onto one of them leaves nothing known about its neighbours.
  it('starts again from a pop onto an entry it never saw', () => {
    let trail = startTrail(entry('a', '/suggest'));
    trail = advanceTrail(trail, entry('z', '/color'), 'POP');
    expect(trail).toEqual(startTrail(entry('z', '/color')));
  });
});

describe('stepsBackTo', () => {
  function walk(...hrefs: string[]) {
    let trail = startTrail(entry('k0', hrefs[0]!));
    hrefs.slice(1).forEach((href, i) => {
      trail = advanceTrail(trail, entry(`k${i + 1}`, href), 'PUSH');
    });
    return trail;
  }

  it('is -1 when the destination is the entry just behind', () => {
    expect(stepsBackTo(walk('/', '/slot', '/color?slot=top'), '/slot')).toBe(-1);
  });

  // The check's list is reached through the tap screen; its arrow goes to the
  // camera, two entries back.
  it('reaches past entries between here and the destination', () => {
    expect(stepsBackTo(walk('/', '/check', '/check/tap', '/check/pieces'), '/check')).toBe(-2);
  });

  it('takes the nearest of several matching entries', () => {
    expect(
      stepsBackTo(walk('/', '/check', '/check/pieces', '/check', '/check/tap'), '/check'),
    ).toBe(-1);
  });

  it('is null when the destination is not behind', () => {
    expect(stepsBackTo(walk('/suggest?slot=top&hex=%23c39a3a'), '/color?slot=top')).toBeNull();
  });

  it('does not count the current entry', () => {
    expect(stepsBackTo(walk('/', '/saved'), '/saved')).toBeNull();
  });

  it('ignores entries ahead of the current one', () => {
    let trail = walk('/', '/slot', '/color?slot=top');
    trail = advanceTrail(trail, entry('k1', '/slot'), 'POP');
    expect(stepsBackTo(trail, '/color?slot=top')).toBeNull();
  });
});
