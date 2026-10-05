import { createContext } from 'react';
import { browserShare } from './browserShare';
import type { SharePort } from './port';

// Its own file for the reason CameraContext is: react-refresh warns when a
// module exports both a component and something else. The default is the
// real device, so only tests need a provider.
export const ShareContext = createContext<SharePort>(browserShare);
