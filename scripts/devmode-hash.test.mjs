// @vitest-environment node
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import process from 'node:process';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { E2E_DEV_MODE_HASH, E2E_PASSPHRASE } from '../e2e/devMode.ts';
import { readPassphrase } from './readPassphrase.mjs';

const script = resolve(import.meta.dirname, 'devmode-hash.mjs');

// Types `keys` into a stand-in for a terminal. A real terminal echoes every
// key itself until raw mode turns that off, so `modes` records each switch.
// `shown` is only what the script wrote back, and `paused` says whether it let
// go of the input again, without which the process never exits.
async function typeAtTerminal(keys) {
  const modes = [];
  const input = Object.assign(new PassThrough(), {
    isTTY: true,
    setRawMode(mode) {
      modes.push(mode);
      return this;
    },
  });
  let shown = '';
  const output = {
    write(text) {
      shown += text;
      return true;
    },
  };
  const reading = readPassphrase(input, output);
  input.write(keys);
  return { passphrase: await reading, modes, shown, paused: input.isPaused() };
}

describe('readPassphrase at a terminal', () => {
  it('reads with the echo off, shows only the prompt, and lets go', async () => {
    expect(await typeAtTerminal('e2e passphrase\r')).toEqual({
      passphrase: 'e2e passphrase',
      modes: [true, false],
      shown: 'Passphrase: \n',
      paused: true,
    });
  });

  // Windows sends \b for Backspace where other terminals send \x7f.
  it.each([
    ['DEL', '\x7f'],
    ['BS', '\b'],
  ])('takes back a character on %s', async (_, backspace) => {
    expect((await typeAtTerminal(`ab${backspace}c\r`)).passphrase).toBe('ac');
  });

  it('stops at the first Enter', async () => {
    expect((await typeAtTerminal('one\rtwo\r')).passphrase).toBe('one');
  });

  it('gives back nothing on Ctrl-C, and still leaves raw mode', async () => {
    expect(await typeAtTerminal('ab\x03')).toEqual({
      passphrase: null,
      modes: [true, false],
      shown: 'Passphrase: \n',
      paused: true,
    });
  });
});

describe('npm run devmode:hash with a pipe', () => {
  // The e2e hash is the one `hashPassphrase` computes in the browser, so this
  // also holds the script's salt and round count to the app's.
  it.each([['\n'], ['\r\n']])(
    'prints the hash of the first line, ended by %j, and nothing else',
    (ending) => {
      const { stdout, stderr, status } = spawnSync(process.execPath, [script], {
        input: `${E2E_PASSPHRASE}${ending}second line${ending}`,
        encoding: 'utf8',
      });
      expect([stdout, stderr, status]).toEqual([`${E2E_DEV_MODE_HASH}\n`, '', 0]);
    },
  );
});
