import { vi } from 'vitest';

// The event Chrome fires when it would offer to install: cancelable, with a
// prompt() to show its dialog and a userChoice that settles when it closes.
export function installOffer(outcome: 'accepted' | 'dismissed' = 'accepted') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn().mockResolvedValue(undefined),
    userChoice: Promise.resolve({ outcome }),
  });
}
