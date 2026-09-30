import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installOffer } from './installOffer.testing';
import { clearInstallOffer, useInstallPrompt } from './useInstallPrompt';

afterEach(() => {
  vi.unstubAllGlobals();
  clearInstallOffer();
});

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

  it('still offers what arrived before the screen was mounted', () => {
    // Chrome fires the event once per page load, wherever the person is by then.
    const offer = installOffer();
    window.dispatchEvent(offer);
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(true);
    expect(offer.defaultPrevented).toBe(true);
  });

  it('keeps the offer when the screen unmounts and comes back', () => {
    const first = renderHook(() => useInstallPrompt());
    act(() => void window.dispatchEvent(installOffer()));
    first.unmount();
    const second = renderHook(() => useInstallPrompt());
    expect(second.result.current.canInstall).toBe(true);
  });
});
