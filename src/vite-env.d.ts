/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lowercase hex PBKDF2-SHA256 of the unlock passphrase; see features/dev/passphrase.ts. */
  readonly VITE_DEV_MODE_HASH?: string;
}
