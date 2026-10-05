// Prints the value to give VITE_DEV_MODE_HASH for a passphrase:
//
//   echo "the passphrase" | npm run --silent devmode:hash
//
// Reads one line from stdin so the passphrase stays out of the shell history
// and the process list. The prefix repeats DEV_HASH_PREFIX from
// src/features/dev/passphrase.ts, which this script does not import.
import { createHash } from 'node:crypto';
import process from 'node:process';

const PREFIX = 'huemi-dev:';

let input = '';
for await (const chunk of process.stdin) input += chunk;
const passphrase = input.split(/\r?\n/)[0] ?? '';
process.stdout.write(
  `${createHash('sha256')
    .update(PREFIX + passphrase)
    .digest('hex')}\n`,
);
