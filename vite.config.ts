import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import stylex from '@stylexjs/unplugin';

export default defineConfig({
  plugins: [
    // MUST precede @vitejs/plugin-react, or React Fast Refresh breaks.
    stylex.vite({
      useCSSLayers: { before: ['reset', 'base'] },
      dev: process.env.NODE_ENV === 'development',
      runtimeInjection: false,
    }),
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
