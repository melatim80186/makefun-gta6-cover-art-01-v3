// Vice Cover — tiny static server for trying the app locally.
// Serves app/ at http://localhost:8080 with Node's standard library
// only: no dependencies, no network calls, nothing leaves the machine.

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "app");
const PORT = Number(process.env.PORT || 8080);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

// Resolve a request path inside app/ and refuse anything that climbs out.
function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const cleaned = normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const full = resolve(join(APP_ROOT, cleaned === "/" ? "index.html" : cleaned));
  if (full !== APP_ROOT && !full.startsWith(APP_ROOT + sep)) return null;
  return full;
}

const server = createServer((req, res) => {
  console.log(req.method + " " + req.url);
  const file = safePath(req.url || "/");
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("not found\n");
    return;
  }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log("Vice Cover serving app/ at http://localhost:" + PORT);
});

// Shut down cleanly so the screenshot runner can stop the server it
// started without leaving a listener behind.
process.on("SIGINT", () => server.close(() => process.exit(0)));
process.on("SIGTERM", () => server.close(() => process.exit(0)));
