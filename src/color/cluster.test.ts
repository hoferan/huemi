import { describe, expect, it } from 'vitest';
import type { Oklab } from './oklab';
import { clusterColors, type ClusterOptions } from './cluster';

const OPTIONS: ClusterOptions = {
  k: 4,
  lightnessWeight: 0.5,
  iterations: 12,
  mergeDistance: 0.06,
  seed: 20,
};

const repeat = (point: Oklab, n: number): Oklab[] => Array.from({ length: n }, () => point);

const byCount = (options: ClusterOptions, points: Oklab[]) =>
  clusterColors(points, options).sort((a, b) => b.count - a.count);

describe('clusterColors', () => {
  it('returns nothing for no points', () => {
    expect(clusterColors([], OPTIONS)).toEqual([]);
  });

  it('keeps one color as one cluster even when k is larger', () => {
    const found = clusterColors(repeat([0.4, -0.01, -0.07], 50), OPTIONS);
    expect(found).toHaveLength(1);
    expect(found[0]!.count).toBe(50);
  });

  it('separates two distinct colors and counts each', () => {
    const points = [...repeat([0.35, -0.01, -0.07], 60), ...repeat([0.93, 0, 0.005], 40)];
    const found = byCount(OPTIONS, points);
    expect(found.map((c) => c.count)).toEqual([60, 40]);
    expect(found[0]!.color[0]).toBeCloseTo(0.35, 5);
  });

  it('merges a lightness-only difference because lightness counts for less', () => {
    const points = [...repeat([0.3, -0.01, -0.07], 50), ...repeat([0.4, -0.01, -0.07], 50)];
    expect(clusterColors(points, OPTIONS)).toHaveLength(1);
    expect(clusterColors(points, { ...OPTIONS, lightnessWeight: 1 })).toHaveLength(2);
  });

  it('takes the median, so a few outliers inside a cluster do not move it', () => {
    const points: Oklab[] = [...repeat([0.4, 0.1, 0.05], 9), [0.42, 0.11, 0.06]];
    const [only] = clusterColors(points, OPTIONS);
    expect(only!.color).toEqual([0.4, 0.1, 0.05]);
  });

  it('gives the same answer for the same input', () => {
    const points: Oklab[] = Array.from({ length: 200 }, (_, i) => [
      (i % 7) / 7,
      ((i * 3) % 11) / 50 - 0.1,
      ((i * 5) % 13) / 50 - 0.1,
    ]);
    expect(clusterColors(points, OPTIONS)).toEqual(clusterColors(points, OPTIONS));
  });

  it('accounts for every point exactly once', () => {
    const points: Oklab[] = Array.from({ length: 300 }, (_, i) => [
      (i % 5) / 5,
      ((i * 7) % 9) / 40 - 0.1,
      0,
    ]);
    const total = clusterColors(points, OPTIONS).reduce((sum, c) => sum + c.count, 0);
    expect(total).toBe(300);
  });
});
