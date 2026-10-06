import { describe, expect, it } from 'vitest';
import { DEV_HASH_ITERATIONS, DEV_HASH_SALT, hashPassphrase, unlockMethod } from './passphrase';

describe('hashPassphrase', () => {
  it('is the PBKDF2-SHA256 hex of the passphrase', async () => {
    expect(DEV_HASH_SALT).toBe('huemi-dev:');
    expect(DEV_HASH_ITERATIONS).toBe(600_000);
    // Computed once with: node -e "console.log(require('crypto').pbkdf2Sync('correct horse', 'huemi-dev:', 600000, 32, 'sha256').toString('hex'))"
    await expect(hashPassphrase('correct horse')).resolves.toBe(
      '7101d6f0c72eb1ef8b26b405bfc85e409794b339176d43c36ae3dc702b59fa9c',
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
