// Ambient declarations for the few non-standard globals the game touches, so the LSP's
// checkJs (see jsconfig.json) stays clean. These are real runtime APIs that simply aren't in
// the standard DOM typings.

interface Window {
  /** localhost-only dev handle (engine + live input + debug); attached in src/main.js. */
  __pj?: any;
}

interface Navigator {
  /** iOS Safari: true when launched from the Home-screen PWA (used by src/ui/installHint.js). */
  standalone?: boolean;
}
