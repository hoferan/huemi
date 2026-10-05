/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Lowercase hex SHA-256 of the unlock passphrase; see features/dev/passphrase.ts. */
  readonly VITE_DEV_MODE_HASH?: string;
}

/** Seven characters of the commit this build came from, or `unknown`; see vite.config.ts. */
declare const __BUILD_COMMIT__: string;
/** The ISO time the build started. */
declare const __BUILD_DATE__: string;
