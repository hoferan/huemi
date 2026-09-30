// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveConfig } from 'vite';

// Netlify's own build cannot run in CI, so the first real check of this file is
// a preview deploy. These assertions cover the edits that would break the
// deployed site without failing any other check. See ADR 0015.
const read = (path: string) => readFileSync(resolve(import.meta.dirname, path), 'utf8');

const toml = read('netlify.toml');
const redirects = read('public/_redirects');
const { build } = await resolveConfig({}, 'build');

describe('netlify.toml', () => {
  it('publishes the directory Vite builds into', () => {
    expect(toml).toContain(`publish = "${build.outDir}"`);
  });

  it('builds with the same install command CI uses', () => {
    expect(toml).toContain('command = "npm ci && npm run build"');
  });

  it('keeps git hooks out of the build machine', () => {
    expect(toml).toContain('HUSKY = "0"');
  });

  it('does not pin a node version, so .nvmrc stays the single source', () => {
    expect(toml).not.toMatch(/NODE_VERSION/);
  });

  it('lets the page use the camera and nothing else sensitive', () => {
    expect(toml).toContain('camera=(self)');
    expect(toml).toContain('microphone=()');
    expect(toml).toContain('geolocation=()');
    expect(toml).not.toContain('camera=()');
  });

  it('sets the three plain security headers', () => {
    expect(toml).toContain('X-Content-Type-Options = "nosniff"');
    expect(toml).toContain('Referrer-Policy = "strict-origin-when-cross-origin"');
    expect(toml).toContain('X-Frame-Options = "DENY"');
  });

  it("caches only Vite's hashed assets as immutable", () => {
    const blocks = toml.split('[[headers]]').slice(1);
    const immutable = blocks.filter((block) => block.includes('immutable'));
    expect(immutable).toHaveLength(1);
    expect(immutable[0]).toContain(`for = "/${build.assetsDir}/*"`);
    expect(immutable[0]).toContain('public, max-age=31536000, immutable');
    expect(toml.match(/immutable/g)).toHaveLength(1);
  });

  it('sets no content security policy', () => {
    expect(toml).not.toMatch(/Content-Security-Policy/i);
  });
});

describe('public/_redirects', () => {
  it('keeps the single-page fallback a plain rewrite', () => {
    expect(redirects).toMatch(/^\/\*\s+\/index\.html\s+200\s*$/m);
    expect(redirects).not.toMatch(/200!|30[12]/);
  });

  it('answers a missing asset with a 404 ahead of the fallback', () => {
    // Without this rule the fallback serves index.html for a removed bundle, and
    // the immutable cache header then pins that HTML to the URL for a year.
    const rules = redirects
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'));
    const missingAsset = rules.findIndex((rule) =>
      new RegExp(`^/${build.assetsDir}/\\*\\s+/404\\.html\\s+404$`).test(rule),
    );
    const fallback = rules.findIndex((rule) => /^\/\*\s+\/index\.html\s+200$/.test(rule));
    expect(missingAsset).toBeGreaterThanOrEqual(0);
    expect(missingAsset).toBeLessThan(fallback);
  });
});
