import { use } from 'react';
import { DevModeContext, type DevModeValue } from './DevModeContext';

export function useDevMode(): DevModeValue {
  return use(DevModeContext);
}
