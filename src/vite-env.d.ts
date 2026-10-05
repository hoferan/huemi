/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lowercase hex SHA-256 of the unlock passphrase; see features/dev/passphrase.ts. */
  readonly VITE_DEV_MODE_HASH?: string;
}
