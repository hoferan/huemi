/**
 * The salt, so the published hash matches no table precomputed for other
 * sites. It is fixed and public, like the hash itself.
 */
export const DEV_HASH_SALT = 'huemi-dev:';

/**
 * PBKDF2 rounds, OWASP's figure for PBKDF2-SHA256. The hash ships in the
 * bundle, so anyone can test guesses against it offline; each guess costs this
 * many SHA-256 rounds instead of one. One check on a phone takes a fraction of
 * a second, which a person typing a passphrase does not notice.
 */
export const DEV_HASH_ITERATIONS = 600_000;

/**
 * Lowercase hex PBKDF2-SHA256 of the passphrase, 256 bits.
 * `scripts/devmode-hash.mjs` computes the same value with node:crypto.
 */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: encoder.encode(DEV_HASH_SALT),
      iterations: DEV_HASH_ITERATIONS,
    },
    key,
    256,
  );
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * How a person can turn the mode on in this build: straight away in the dev
 * server, by passphrase in a build that was given a hash, not at all otherwise.
 * An empty hash counts as none, since a blank variable in a deploy setting is
 * more likely a mistake than a wish to match the empty digest.
 */
export type UnlockMethod = 'direct' | 'passphrase' | 'none';

export function unlockMethod(env: { dev: boolean; hash: string | undefined }): UnlockMethod {
  if (env.dev) return 'direct';
  return env.hash ? 'passphrase' : 'none';
}
