import { use, useEffect, useState } from 'react';
import type { FieldGarment } from '../../../model/field';
import { FieldStoreContext } from './FieldStoreContext';

export type GarmentState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'missing' }
  | { status: 'ready'; garment: FieldGarment };

/**
 * The garment a kit screen's `?id=` names. `missing` covers an absent id and
 * one with no garment, such as a stale link after a delete, so the screen
 * can send both to the list.
 */
export function useGarment(id: string | null): GarmentState {
  const store = use(FieldStoreContext);
  const [state, setState] = useState<GarmentState>({ status: 'loading' });

  useEffect(() => {
    let current = true;
    void store.listGarments().then((result) => {
      if (!current) return;
      if (!result.ok) return setState({ status: 'error' });
      const garment = result.value.find((candidate) => candidate.id === id);
      setState(garment ? { status: 'ready', garment } : { status: 'missing' });
    });
    return () => {
      current = false;
    };
  }, [store, id]);

  return state;
}
