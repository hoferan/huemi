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
// The salt and the round count repeat DEV_HASH_SALT and DEV_HASH_ITERATIONS
// from src/features/dev/passphrase.ts, which this script does not import. If
// they drift, the hash it prints never unlocks.
import { pbkdf2Sync } from 'node:crypto';
import process from 'node:process';
import { createInterface } from 'node:readline';

const SALT = 'huemi-dev:';
const ITERATIONS = 600_000;

// To stderr, so the only thing on stdout is the hash.
if (process.stdin.isTTY) process.stderr.write('Passphrase: ');

let passphrase = '';
for await (const line of createInterface({ input: process.stdin, crlfDelay: Infinity })) {
  passphrase = line;
  break;
}

process.stdout.write(`${pbkdf2Sync(passphrase, SALT, ITERATIONS, 32, 'sha256').toString('hex')}\n`);
