// Vice Cover — the entry program.
// Copies app/ and screenshots/ from this repository into the output
// directory and writes /output/dossier.json with buildDossier from the
// kit's vendor library. Node 22 standard library only; nothing is
// installed before it runs, and it runs twice with identical bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-app.ts";

// The caps the gate holds the dossier to: the source text budget, the
// screenshot count and size, and the app/ tree limits from the rules.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";

function freshCopy(name) {
  const from = join(repoRoot, name);
  const to = join(outDir, name);
  rmSync(to, { recursive: true, force: true });
  if (!existsSync(from)) {
    throw new Error("missing in repository: " + name);
  }
  cpSync(from, to, { recursive: true });
  return to;
}

function main() {
  mkdirSync(outDir, { recursive: true });
  const appOut = freshCopy("app");
  const shotsOut = freshCopy("screenshots");
  const bytes = buildDossier(outDir, DOSSIER_CAPS);
  writeFileSync(join(outDir, "dossier.json"), bytes);
  // The dossier is JSON: prove it parses before claiming success.
  JSON.parse(new TextDecoder().decode(bytes));
  console.log("vice-cover: copied " + appOut);
  console.log("vice-cover: copied " + shotsOut);
  console.log("vice-cover: dossier.json " + bytes.length + " bytes");
}

main();

import { readdirSync, statSync } from "node:fs";

// Post-run summary: the shape of what was handed in, so a human running
// this by hand sees the entry's files and bytes at a glance.
function summarizeOut() {
  let files = 0;
  let bytes = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        files++;
        bytes += statSync(full).size;
      }
    }
  };
  walk(outDir);
  console.log("vice-cover: output holds " + files + " files, " + bytes + " bytes");
}

summarizeOut();
