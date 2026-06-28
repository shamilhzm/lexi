import { useSyncExternalStore } from 'react';
import { subscribe, getVersion } from './store.ts';

/** Re-render the caller whenever the store mutates. Returns the version int. */
export function useStore(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
