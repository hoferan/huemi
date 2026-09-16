import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

const stylexPlugin: Plugin = stylex.vite({
  useCSSLayers: { before: ['reset', 'base'] },
  dev: process.env.NODE_ENV === 'development',
  runtimeInjection: false,
});

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
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportOnFailure: true,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.stylex.ts',
        'src/**/*.d.ts',
        'src/main.tsx',
        'src/test-setup.ts',
        'src/vite-env.d.ts',
      ],
    },
  },
});
