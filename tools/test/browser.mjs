// Shared browser launcher for the test scripts.
//
// Default behaviour is unchanged: launch the installed Microsoft Edge via playwright-core
// (channel "msedge", no browser download) — the project's documented local workflow.
//
// For CI / headless Linux / remote dev environments where Edge isn't installed, two env
// vars let you point at any Chromium-family binary without editing the tests:
//   PJ_BROWSER_PATH    — absolute path to a chrome/chromium executable (overrides channel)
//   PJ_BROWSER_CHANNEL — playwright channel name (default "msedge"; e.g. "chrome")
import { chromium } from "playwright-core";

export function launchBrowser(opts = {}) {
  const execPath = process.env.PJ_BROWSER_PATH;
  const channel = process.env.PJ_BROWSER_CHANNEL || "msedge";
  const base = { headless: true, ...opts };
  // An explicit executable wins and must NOT be combined with a channel.
  if (execPath) return chromium.launch({ ...base, executablePath: execPath });
  return chromium.launch({ ...base, channel });
}

// Optional: serve Kaplay from a local file instead of the unpkg CDN. Inert unless
// PJ_KAPLAY_LOCAL points at a kaplay.mjs — used to run the gates in offline / CI / sandboxed
// environments where the CDN is unreachable. On the normal setup (CDN reachable) it's a no-op.
export async function routeVendorKaplay(page) {
  const local = process.env.PJ_KAPLAY_LOCAL;
  if (!local) return;
  await page.route(/unpkg\.com\/.*kaplay.*\.mjs/, (route) =>
    route.fulfill({ path: local, contentType: "text/javascript" }),
  );
}
