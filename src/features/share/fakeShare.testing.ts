import type { DrawOp, Measure } from './layout';
import { SHARE_FILE_NAME, type SharePort } from './port';

/** Half the font's pixel size per character: wide enough to wrap, simple to count. */
export const charMeasure: Measure = (text, font) => {
  const size = Number(/(\d+)px/.exec(font)?.[1] ?? 0);
  return text.length * 0.5 * size;
};

export type FakeSharePort = SharePort & {
  calls: {
    share: ShareData[];
    download: File[];
    copy: string[];
    render: (readonly DrawOp[])[];
  };
};

/**
 * A device that can share files, and says yes to every share, unless told
 * otherwise. Every call is recorded. Each render gives a new File, so a test
 * can tell which render a share used.
 */
export function fakeSharePort(overrides: Partial<SharePort> = {}): FakeSharePort {
  const calls: FakeSharePort['calls'] = { share: [], download: [], copy: [], render: [] };
  const port: SharePort = {
    render: () => Promise.resolve(new File([''], SHARE_FILE_NAME, { type: 'image/png' })),
    canShareFiles: () => true,
    canShare: () => true,
    share: () => Promise.resolve('shared'),
    download: () => undefined,
    copy: () => Promise.resolve(true),
    ...overrides,
  };
  return {
    calls,
    render: (ops, width, height) => {
      calls.render.push(ops);
      return port.render(ops, width, height);
    },
    canShareFiles: (files) => port.canShareFiles(files),
    canShare: () => port.canShare(),
    share: (data) => {
      calls.share.push(data);
      return port.share(data);
    },
    download: (file) => {
      calls.download.push(file);
      port.download(file);
    },
    copy: (text) => {
      calls.copy.push(text);
      return port.copy(text);
    },
  };
}
