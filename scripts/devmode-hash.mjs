// Prints the value to give VITE_DEV_MODE_HASH for a passphrase. Run it and
// type the passphrase at the prompt:
//
//   npm run --silent devmode:hash
//
// The passphrase is read from stdin, never from an argument, so it stays out
// of the shell history and the process list. A pipe works too, for a script
// that already holds the passphrase:
//
//   printf '%s\n' "$PASSPHRASE" | npm run --silent devmode:hash
//
// Only the first line counts, without its line ending; every other character,
// spaces included, is part of the passphrase. That is why the prompt is better
// than `echo` in a shell: cmd.exe's echo keeps the space before a pipe.
//
// The prefix repeats DEV_HASH_PREFIX from src/features/dev/passphrase.ts,
// which this script does not import.
import { createHash } from 'node:crypto';
import process from 'node:process';
import { createInterface } from 'node:readline';

const PREFIX = 'huemi-dev:';

// To stderr, so the only thing on stdout is the hash.
if (process.stdin.isTTY) process.stderr.write('Passphrase: ');

let passphrase = '';
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  passphrase = line;
  break;
}

process.stdout.write(
  `${createHash('sha256')
    .update(PREFIX + passphrase)
    .digest('hex')}\n`,
);
