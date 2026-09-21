import { use } from 'react';
import { SessionContext } from './SessionContext';
import type { SessionValue } from './SessionContext';

export function useSession(): SessionValue {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession needs a SessionProvider above it');
  return value;
}
