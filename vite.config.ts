// defineConfig comes from vitest/config, not vite: the `test` block below
// is a Vitest option, and Vite's own defineConfig types reject it.
import { defaultExclude, defineConfig } from 'vitest/config';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

// @stylexjs/unplugin ships its Vite factory typed as `(options) => any`. The
// cast below asserts the actual return type; the value really is a Vite
// plugin object, the upstream signature just doesn't say so.
const stylexPlugin = stylex.vite({
  useCSSLayers: { before: ['reset', 'base'] },
  dev: process.env.NODE_ENV === 'development',
  runtimeInjection: false,
}) as Plugin;

// @stylexjs/unplugin's configureServer hook starts a setInterval that polls
// for CSS updates to push over the dev server's websocket, and only clears
// it on the Vite httpServer's 'close' event. Vitest runs Vite in middleware
// mode (no httpServer), so that 'close' event never fires and the interval
// leaks for the life of the process, which is why `vitest run` hangs for
// ~10s at exit ("something prevents 2 Vite servers from exiting"). The
// websocket push is dev-server HMR machinery that Vitest's jsdom
// environment never uses; the stylex.defineVars/stylex.create transform
// lives in the plugin's other hooks (load/transform/etc.), so dropping only
// configureServer under Vitest removes the leaked timer without touching
// the transform tests rely on.
if (process.env.VITEST) {
  delete stylexPlugin.configureServer;
}

export default defineConfig({
  plugins: [
    // MUST precede @vitejs/plugin-react, or React Fast Refresh breaks.
    stylexPlugin,
    react(),
  ],
  server: {
    // The preview harness assigns a free port and passes it in PORT, which
    // Vite does not read on its own. Leaving the value undefined falls back
    // to Vite's default, so a plain `npm run dev` still serves on 5173.
    port: process.env.PORT ? Number(process.env.PORT) : undefined,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    // JUnit only under CI, where Codecov's test analytics consumes it. Locally
    // it would write a file nobody reads on every run, so the default reporter
    // stands alone there. `default` is listed explicitly because naming any
    // reporter replaces the default rather than adding to it.
    reporters: process.env.CI ? ['default', 'junit'] : ['default'],
    outputFile: { junit: './test-report.junit.xml' },
    // Vitest's default include glob otherwise also matches e2e/invariants.spec.ts
    // and the generated e2e/*.feature.spec.js: both are Playwright tests, run
    // through `npm run e2e`, not Vitest.
    //
    // `.claude/**` covers the worktrees the desktop app creates under
    // `.claude/worktrees/`. Each one is a second checkout of this repository, so
    // without this the suite runs every test twice — once here and once in the
    // worktree — and fails on the worktree's copy of e2e/invariants.spec.ts,
    // which the `e2e/**` glob above does not reach because it is not at the root.
    // CI checks out fresh and has no worktrees, so this only ever bites locally,
    // which is why it went unnoticed.
    exclude: [...defaultExclude, 'e2e/**', '.claude/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportOnFailure: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stylex.ts',
        'src/**/*.d.ts',
        'src/app/main.tsx',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
        // The harness is a development instrument, served from harness.html
        // and never built. It is deliberately untested: what it is for is
        // looking at colors, which no assertion replaces.
        'src/dev/**',
      ],
    },
  },
});
