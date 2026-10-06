import { createContext } from 'react';
import { indexedDbField } from '../../../storage/indexedDbField';
import type { FieldStore } from '../../../storage/port';

// Its own file for the reason ShareContext is. The default is the real
// database, so only tests need a provider.
export const FieldStoreContext = createContext<FieldStore>(indexedDbField);
