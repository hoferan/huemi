import type { ReactElement } from 'react';
import { Entry } from '../features/entry/Entry';
import { Onboarding } from '../features/onboarding/Onboarding';
import { OnboardingGate } from '../features/onboarding/OnboardingGate';
import { CustomColor } from '../features/pick/CustomColor';
import { Picker } from '../features/pick/Picker';
import { SlotChoice } from '../features/pick/SlotChoice';

export type AppRoute = { path: string; element: ReactElement };

/**
 * One entry per screen, as data so that `src/app/routes.test.tsx` can compare
 * it with `e2e/routes.ts`. Adding a route to one side and not the other would
 * otherwise leave lint, types, unit tests and all three accessibility checks
 * green while axe, reflow and the text-size check never visit the new screen.
 *
 * Its own file rather than a second export from `routes.tsx`, for the reason
 * `SessionContext.ts` is its own file: react-refresh/only-export-components
 * warns when a module exports both a component and something else.
 */
export const APP_ROUTES: readonly AppRoute[] = [
  {
    path: '/',
    element: (
      <OnboardingGate>
        <Entry />
      </OnboardingGate>
    ),
  },
  { path: '/welcome', element: <Onboarding /> },
  { path: '/slot', element: <SlotChoice /> },
  { path: '/color', element: <Picker /> },
  { path: '/color/custom', element: <CustomColor /> },
];
