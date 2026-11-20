// Vice Cover — screenshot runner.
// Starts the local server, drives the bundled headless Chromium over its
// debugging protocol, captures the four screenshots (a cover first, then
// the editor at work, then two more exported covers) and writes
// shots.json, the manifest of what it shot. Node standard library only:
// fetch and WebSocket are Node 22 globals, so no packages are needed.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const shotsDir = join(repoRoot, "screenshots");
const CHROME =
  process.env.CHROME_PATH ||
  join(homedir(), ".cache/ms-playwright/chromium-1228/chrome-linux64/chrome");
const DEBUG_PORT = 9223;
// The shot run uses its own port: 8080 is the app's documented default,
// but another live agent already serves there on this machine.
const SHOT_PORT = process.env.VICE_PORT || "18080";
const BASE = "http://localhost:" + SHOT_PORT;

// One scene per screenshot: the file, the viewport, and the app URL that
// stages it. The first by name is the cover, as the rules ask.
const SCENES = [
  {
    file: "1-cover.jpg",
    width: 1280,
    height: 720,
    url: BASE + "/?shot=cover&layout=triptych&grade=sunset&title=SUNSET%20HEIST&size=1920x1080",
    note: "exported triptych cover, Vice Sunset, 1920x1080",
  },
  {
    file: "2-editor.jpg",
    width: 1280,
    height: 800,
    url: BASE + "/?shot=editor&layout=quad&grade=sunset&title=BOULEVARD%20QUEEN&size=1920x1080",
    note: "editor with a photo loaded, quad layout",
  },
  {
    file: "3-cover-tall.jpg",
    width: 1024,
    height: 1280,
    url: BASE + "/?shot=cover&layout=mosaic&grade=neon&title=NEON%20DRIVE&size=1080x1350",
    note: "exported mosaic cover, Neon Pink, 1080x1350",
  },
  {
    file: "4-cover-square.jpg",
    width: 1080,
    height: 1080,
    url: BASE + "/?shot=cover&layout=split&grade=gold&title=PALM%20COURT&size=1080x1080",
    note: "exported split cover, Gold Hour, 1080x1080",
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  for (;;) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      // Not up yet; keep waiting until the deadline.
    }
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for " + label);
    await sleep(250);
  }
}

// Minimal CDP client: one WebSocket, one id counter, one promise per call.
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.jsErrors = [];
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      } else if (msg.method === "Runtime.exceptionThrown") {
        this.jsErrors.push("exception: " + JSON.stringify(msg.params.exceptionDetails).slice(0, 400));
      } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
        this.jsErrors.push(
          "console.error: " + msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 400),
        );
      }
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const out = await this.send("Runtime.evaluate", { expression, returnByValue: true });
    return out.result ? out.result.value : undefined;
  }

  async waitReady(timeoutMs = 20000) {
    const start = Date.now();
    for (;;) {
      const ready = await this.evaluate("window.__viceReady === true");
      if (ready) return;
      if (Date.now() - start > timeoutMs) throw new Error("app never signalled ready");
      await sleep(200);
    }
  }
}

import { tmpdir } from "node:os";

function startServer() {
  const server = spawn(process.execPath, [join(repoRoot, "serve.ts")], {
    cwd: repoRoot,
    env: { ...process.env, PORT: SHOT_PORT },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stdout.on("data", (chunk) => process.stdout.write("[serve] " + chunk));
  server.stderr.on("data", (chunk) => process.stderr.write("[serve] " + chunk));
  return server;
}

async function main() {
  mkdirSync(shotsDir, { recursive: true });
  if (!existsSync(CHROME)) throw new Error("chromium not found at " + CHROME);
  const server = startServer();
  let chrome = null;
  try {
    await waitFor(async () => {
      const res = await fetch(BASE + "/");
      return res.ok;
    }, 15000, "local server");
    const profile = join(tmpdir(), "vice-cover-chrome-profile");
    mkdirSync(profile, { recursive: true });
    // One Chrome for all scenes: the viewport is resized per scene with
    // the emulation override, which the layout viewport really follows
    // (verified: innerWidth/innerHeight match the override, and the
    // capture comes out at exactly that size).
    chrome = spawn(CHROME, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--hide-scrollbars",
      "--remote-debugging-port=" + DEBUG_PORT,
      "--user-data-dir=" + profile,
      "--window-size=1280,800",
      "about:blank",
    ], { stdio: "ignore" });
    const version = await waitFor(async () => {
      const res = await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/version");
      return res.ok ? res.json() : null;
    }, 20000, "chrome devtools");
    console.log("chrome: " + version.Browser);
    const targets = await (await fetch("http://127.0.0.1:" + DEBUG_PORT + "/json/list")).json();
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target in chrome");
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = (err) => reject(new Error("websocket failed: " + err.message));
    });
    const cdp = new Cdp(ws);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    const manifest = [];
    const allJsErrors = [];
    for (const scene of SCENES) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: scene.width,
        height: scene.height,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await cdp.send("Page.navigate", { url: scene.url });
      await cdp.waitReady();
      await sleep(400);
      let quality = 85;
      let bytes;
      for (;;) {
        const shot = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality });
        bytes = Buffer.from(shot.data, "base64");
        if (bytes.length <= 262144 || quality <= 55) break;
        quality -= 15;
      }
      writeFileSync(join(shotsDir, scene.file), bytes);
      manifest.push({
        file: scene.file,
        scene: scene.note,
        width: scene.width,
        height: scene.height,
        bytes: bytes.length,
        quality,
      });
      console.log("shot " + scene.file + " — " + bytes.length + " bytes at quality " + quality);
      allJsErrors.push(...cdp.jsErrors);
    }
    ws.close();
    if (allJsErrors.length > 0) {
      throw new Error("JS errors during shots: " + allJsErrors.join(" | "));
    }
    writeFileSync(
      join(repoRoot, "shots.json"),
      JSON.stringify({ tool: "app/src/shots.js", generatedAt: new Date().toISOString(), shots: manifest }, null, 2) + "\n",
    );
    console.log("wrote shots.json with " + manifest.length + " shots");
  } finally {
    if (chrome) chrome.kill();
    server.kill();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
