/**
 * Mixed into the passphrase before hashing, so the published hash is not a
 * plain SHA-256 of the passphrase that a lookup table of common words covers.
 */
export const DEV_HASH_PREFIX = 'huemi-dev:';

/** Lowercase hex SHA-256 of the prefix and the passphrase. */
export async function hashPassphrase(passphrase: string): Promise<string> {
  const bytes = new TextEncoder().encode(DEV_HASH_PREFIX + passphrase);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
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
