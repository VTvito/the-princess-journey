// deploy.mjs — production deploy to Vercel that reads VERCEL_TOKEN from the gitignored
// .env, so the token never has to be pasted again. The .env is also vercelignored, so it
// is never uploaded.
//
//   npm run deploy              → production deploy (aliases the live URL)
//   npm run deploy -- --preview → a throwaway preview deployment instead
//
// Falls back to an ambient VERCEL_TOKEN env var if there is no .env.

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

let token = process.env.VERCEL_TOKEN || "";
try {
  const env = readFileSync(join(root, ".env"), "utf8");
  const m = env.match(/^\s*VERCEL_TOKEN\s*=\s*(.+?)\s*$/m);
  if (m) token = m[1].trim();
} catch {
  // no .env — fall back to the ambient VERCEL_TOKEN if one is set
}

if (!token) {
  console.error(
    "VERCEL_TOKEN not found. Put it in a gitignored .env as:\n" +
      "  VERCEL_TOKEN=...\n" +
      "(get one at https://vercel.com/account/tokens) — see README → Deploy.",
  );
  process.exit(1);
}

const preview = process.argv.includes("--preview");
const args = [
  "vercel",
  "deploy",
  ...(preview ? [] : ["--prod"]),
  "--scope",
  "lion-vi", // token belongs to a team; the CLI applies no default team non-interactively
  "--yes", // don't prompt (project is already linked via .vercel/)
  "--token",
  token,
];

// stdio inherit streams Vercel's progress + the resulting URL; the token is passed as an
// argv element to the child, never printed.
const r = spawnSync("npx", args, { stdio: "inherit", cwd: root, shell: true });
process.exit(r.status ?? 1);
