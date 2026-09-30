import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installOffer } from './installOffer.testing';
import { useInstallPrompt } from './useInstallPrompt';

afterEach(() => vi.unstubAllGlobals());

describe('useInstallPrompt', () => {
  it('cannot install until the browser offers it', () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it("can install once the browser offers it, and holds back the browser's own bar", () => {
    const { result } = renderHook(() => useInstallPrompt());
    const offer = installOffer();
    act(() => void window.dispatchEvent(offer));
    expect(result.current.canInstall).toBe(true);
    expect(offer.defaultPrevented).toBe(true);
  });

  it.each(['accepted', 'dismissed'] as const)(
    'prompts once and then hides when %s',
    async (outcome) => {
      const { result } = renderHook(() => useInstallPrompt());
      const offer = installOffer(outcome);
      act(() => void window.dispatchEvent(offer));
      await act(() => result.current.install());
      expect(offer.prompt).toHaveBeenCalledOnce();
      expect(result.current.canInstall).toBe(false);
    },
  );

  it('hides after the app is installed', () => {
    const { result } = renderHook(() => useInstallPrompt());
    act(() => void window.dispatchEvent(installOffer()));
    act(() => void window.dispatchEvent(new Event('appinstalled')));
    expect(result.current.canInstall).toBe(false);
  });

  it('stays hidden when already running as an installed app', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('standalone') }));
    const { result } = renderHook(() => useInstallPrompt());
    act(() => void window.dispatchEvent(installOffer()));
    expect(result.current.canInstall).toBe(false);
  });

  it('works where matchMedia does not exist', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useInstallPrompt());
    act(() => void window.dispatchEvent(installOffer()));
    expect(result.current.canInstall).toBe(true);
  });

  it('stops listening on unmount', () => {
    const { unmount } = renderHook(() => useInstallPrompt());
    unmount();
    const offer = installOffer();
    window.dispatchEvent(offer);
    expect(offer.defaultPrevented).toBe(false);
  });
});
