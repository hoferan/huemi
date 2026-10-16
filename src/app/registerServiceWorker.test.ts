import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './registerServiceWorker';

describe('registerServiceWorker', () => {
  it('registers /sw.js at the root when enabled', async () => {
    const register = vi.fn().mockResolvedValue(undefined);
    await registerServiceWorker(true, { register });
    expect(register).toHaveBeenCalledOnce();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('watches the registration for a new version', async () => {
    const registration = {};
    const watch = vi.fn();
    await registerServiceWorker(true, { register: vi.fn().mockResolvedValue(registration) }, watch);
    expect(watch).toHaveBeenCalledWith(registration);
  });

  it('does nothing when disabled', async () => {
    const register = vi.fn();
    await registerServiceWorker(false, { register });
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no service workers', async () => {
    await expect(registerServiceWorker(true, undefined)).resolves.toBeUndefined();
  });

  it('swallows a failed registration', async () => {
    const register = vi.fn().mockRejectedValue(new Error('blocked'));
    await expect(registerServiceWorker(true, { register })).resolves.toBeUndefined();
  });
});
