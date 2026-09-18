import { use } from 'react';
import { AnnounceContext } from './AnnounceContext';

export function useAnnounce(): (message: string) => void {
  const announce = use(AnnounceContext);
  if (!announce) throw new Error('useAnnounce needs an Announcer above it');
  return announce;
}
