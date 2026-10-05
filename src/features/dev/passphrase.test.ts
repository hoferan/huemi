import { describe, expect, it } from 'vitest';
import { DEV_HASH_PREFIX, hashPassphrase, unlockMethod } from './passphrase';

describe('hashPassphrase', () => {
  it('is the SHA-256 hex of the prefix and the passphrase', async () => {
    expect(DEV_HASH_PREFIX).toBe('huemi-dev:');
    // Computed once with: node -e "console.log(require('crypto').createHash('sha256').update('huemi-dev:correct horse').digest('hex'))"
    await expect(hashPassphrase('correct horse')).resolves.toBe(
      'fb8bee7995a29807fefcf7ca2c96f554af47302c6d4e199be4e7839569b5e43e',
    );
  });
});

describe('unlockMethod', () => {
  it('unlocks directly in a dev build', () => {
    expect(unlockMethod({ dev: true, hash: undefined })).toBe('direct');
  });

  it('asks for a passphrase in a build that carries a hash', () => {
    expect(unlockMethod({ dev: false, hash: 'ab12' })).toBe('passphrase');
  });

  it('cannot unlock without a hash', () => {
    expect(unlockMethod({ dev: false, hash: undefined })).toBe('none');
    expect(unlockMethod({ dev: false, hash: '' })).toBe('none');
  });
});
