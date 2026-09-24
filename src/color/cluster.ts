import type { Oklab } from './oklab';

export type ClusterOptions = {
  /** Most groups k-means may form before merging. */
  k: number;
  /** How much a lightness difference counts against an a or b difference. */
  lightnessWeight: number;
  iterations: number;
  /** Groups closer than this, in the weighted space, become one. */
  mergeDistance: number;
  seed: number;
};

/** Median color of the group and how many samples it holds. */
export type Cluster = { color: Oklab; count: number };

type Distance = (p: Oklab, q: Oklab) => number;

// mulberry32, a small seeded generator. It only has to spread the k-means++ picks.
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// k-means++: each new center is drawn with probability proportional to its
// squared distance from the nearest center so far. Stops early when every
// point already sits on a center, which is how one flat color stays one group.
function seedCenters(
  points: readonly Oklab[],
  k: number,
  d2: Distance,
  next: () => number,
): Oklab[] {
  const centers: Oklab[] = [points[Math.floor(next() * points.length)]!];
  const nearest = points.map((p) => d2(p, centers[0]!));
  while (centers.length < k) {
    const total = nearest.reduce((sum, d) => sum + d, 0);
    if (total === 0) break;
    let target = next() * total;
    let pick = nearest.length - 1;
    for (let i = 0; i < nearest.length; i++) {
      target -= nearest[i]!;
      if (target <= 0) {
        pick = i;
        break;
      }
    }
    const center = points[pick]!;
    centers.push(center);
    nearest.forEach((d, i) => {
      nearest[i] = Math.min(d, d2(points[i]!, center));
    });
  }
  return centers;
}

function assign(points: readonly Oklab[], centers: Oklab[], d2: Distance, iterations: number) {
  const labels = new Int32Array(points.length).fill(-1);
  for (let round = 0; round < iterations; round++) {
    let changed = false;
    points.forEach((p, i) => {
      let best = 0;
      let bestDistance = Infinity;
      centers.forEach((c, j) => {
        const d = d2(p, c);
        if (d < bestDistance) {
          bestDistance = d;
          best = j;
        }
      });
      if (labels[i] !== best) {
        labels[i] = best;
        changed = true;
      }
    });
    if (!changed) break;
    const sums = centers.map(() => [0, 0, 0, 0]);
    points.forEach((p, i) => {
      const s = sums[labels[i]!]!;
      s[0]! += p[0];
      s[1]! += p[1];
      s[2]! += p[2];
      s[3]! += 1;
    });
    sums.forEach(([l, a, b, n], j) => {
      if (n) centers[j] = [l! / n, a! / n, b! / n];
    });
  }
  return labels;
}

type Group = { mean: Oklab; members: number[] };

// Repeatedly folds the closest pair together while it is under the merge
// distance, the larger group absorbing the smaller.
function merge(groups: Group[], d2: Distance, mergeDistance: number): Group[] {
  let open = groups;
  for (;;) {
    let pair: [Group, Group] | null = null;
    let closest = Infinity;
    for (let i = 0; i < open.length; i++) {
      for (let j = i + 1; j < open.length; j++) {
        const d = d2(open[i]!.mean, open[j]!.mean);
        if (d < closest) {
          closest = d;
          pair = [open[i]!, open[j]!];
        }
      }
    }
    if (!pair || Math.sqrt(closest) >= mergeDistance) return open;
    const [big, small] =
      pair[0].members.length >= pair[1].members.length ? pair : [pair[1], pair[0]];
    const n = big.members.length + small.members.length;
    big.mean = big.mean.map(
      (v, c) => (v * big.members.length + small.mean[c]! * small.members.length) / n,
    ) as Oklab;
    big.members = big.members.concat(small.members);
    open = open.filter((g) => g !== small);
  }
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[(sorted.length - 1) >> 1]!;
};

/**
 * Groups OKLab samples into the few colors they are made of.
 *
 * Lightness is scaled by `lightnessWeight` before any distance is taken.
 * Shading across one fabric moves lightness far more than a or b, so without
 * the weight a fold in a plain shirt would come back as two colors.
 *
 * Each group reports the median of its members channel by channel, not the
 * mean, so a few highlight or shadow pixels do not drag it.
 */
export function clusterColors(points: readonly Oklab[], options: ClusterOptions): Cluster[] {
  if (points.length === 0) return [];
  const w = options.lightnessWeight;
  const d2: Distance = (p, q) => {
    const dl = (p[0] - q[0]) * w;
    const da = p[1] - q[1];
    const db = p[2] - q[2];
    return dl * dl + da * da + db * db;
  };

  const centers = seedCenters(points, options.k, d2, random(options.seed));
  const labels = assign(points, centers, d2, options.iterations);

  const groups: Group[] = centers.map((mean) => ({ mean, members: [] }));
  labels.forEach((label, i) => groups[label]!.members.push(i));

  return merge(
    groups.filter((g) => g.members.length > 0),
    d2,
    options.mergeDistance,
  ).map(({ members }) => ({
    color: [0, 1, 2].map((c) => median(members.map((i) => points[i]![c]!))) as Oklab,
    count: members.length,
  }));
}
