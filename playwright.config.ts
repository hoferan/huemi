import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// playwright-bdd's generated tests look up their config at runtime keyed by
// the running project's `testDir`, so `outputDir` here MUST be the exact
// value used as `testDir` below — not merely nested inside it. That is also
// why the invariants spec has to live directly in `e2e/` rather than in its
// own subfolder: it needs to be under the same testDir as the generated
// spec so both projects (mobile, narrow) discover and run it.
const testDir = defineBddConfig({
  featuresRoot: 'e2e/features',
  steps: 'e2e/steps/**/*.ts',
  outputDir: 'e2e',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      // 390x844 matches the prototype's phone frame.
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
    {
      // Narrow reflow. The prototype's screens are built never to scroll
      // inside a fixed frame; this stops that assumption being locked in
      // before any real screen exists.
      name: 'narrow',
      use: { ...devices['Pixel 7'], viewport: { width: 320, height: 844 } },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
});
