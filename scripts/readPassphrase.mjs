import { createInterface, emitKeypressEvents } from 'node:readline';

/**
 * Reads a passphrase from `input`: up to the first line ending, which is not
 * part of it. At a terminal it prompts on `output` and turns the terminal's
 * echo off, so what is typed never reaches the screen or its scrollback.
 * Ctrl-C there gives null.
 *
 * `output` should be stderr, so that a caller printing a result to stdout
 * prints nothing else there.
 */
export function readPassphrase(input, output) {
  return input.isTTY ? typedAt(input, output) : firstLine(input);
}

async function firstLine(input) {
  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    return line;
  }
  return '';
}

// Raw mode is what silences the echo. It also means the terminal no longer
// handles Backspace or turns Ctrl-C into an interrupt, so both are done here,
// and it has to be switched off again whichever way the reading ends.
function typedAt(terminal, output) {
  output.write('Passphrase: ');
  emitKeypressEvents(terminal);
  terminal.setRawMode(true);
  terminal.resume();
  return new Promise((resolve) => {
    let typed = '';
    const finish = (passphrase) => {
      terminal.off('keypress', onKey);
      terminal.setRawMode(false);
      terminal.pause();
      output.write('\n');
      resolve(passphrase);
    };
    function onKey(char, key) {
      if (key.ctrl && key.name === 'c') finish(null);
      else if (key.name === 'return' || key.name === 'enter') finish(typed);
      else if (key.name === 'backspace') typed = typed.slice(0, -1);
      // Arrow keys and other escape sequences come with no character.
      else if (char !== undefined && !key.ctrl && !key.meta) typed += char;
    }
    terminal.on('keypress', onKey);
  });
}
