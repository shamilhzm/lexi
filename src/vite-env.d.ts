/// <reference types="vite/client" />

/** Injected by vite.config.ts — the commit this bundle was built from, and when.
 *  See `src/lib/build.ts`. */
declare const __BUILD_SHA__: string;
declare const __BUILD_TIME__: string;

interface ImportMetaEnv {
  /** `'1'` in a build for an app store — see `vite.config.ts` and `lib/platform.ts`. */
  readonly VITE_STORE_BUILD?: string;
}
