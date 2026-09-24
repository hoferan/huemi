import { createContext } from 'react';
import { browserCamera } from './browserCamera';
import type { CameraPort } from './port';

// Its own file for the reason AnnounceContext is: react-refresh warns when a
// module exports both a component and something else. The default is the
// real device, so only tests need a provider.
export const CameraContext = createContext<CameraPort>(browserCamera);
