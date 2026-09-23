import { use } from 'react';
import { OutfitsContext, type OutfitsValue } from './OutfitsContext';

export function useOutfits(): OutfitsValue {
  const value = use(OutfitsContext);
  if (!value) throw new Error('useOutfits needs an OutfitsProvider above it');
  return value;
}
