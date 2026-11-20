# Vice Cover — GTA 6 Cover Art Maker

[![gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/c/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/melatim80186/makefun-gta6-cover-art-01-v3/rank.svg)](https://make.fun/c/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/melatim80186/makefun-gta6-cover-art-01-v3/reward.svg)](https://make.fun/c/gta6-cover-art-01)

Turn any photo into a GTA VI-style cover poster: pick a layout, grade it
like a Vice City sunset, letter the title big and loud, and export a PNG
to share. Everything runs offline in the browser — photos never leave
the machine.

## What it does

- **Any photo** — upload your own or pick from six built-in Vice City
  shots (skyline, palms, beach, neon street, retro sun, city night).
  Each panel crops and pans independently: click a panel slot, zoom with
  the slider, drag the cover to position the photo.
- **9 poster layouts** — Hero, Triptych, Quad, Strips, Split, Hero Top,
  Mosaic, Diagonal and Duo, all with white poster gutters.
- **6 gradient-map grades** — Vice Sunset, Neon Pink, Teal Dusk, Gold
  Hour, Magenta Night and Mono Ink — plus a Poster Ink effect that
  flattens the photo into flat poster colour.
- **Lettering** — a big outlined gradient title, a neon script subtitle
  and an editable caption, over a retro sun, palm silhouettes and birds.
- **Exports** — one click to PNG in 1920×1080, 1080×1350 or 1080×1080.
- **Self-test** — the "Run self-test" button renders every layout once
  and reports the result, so a broken layout cannot hide.
- **Surprise me** — one click shuffles the layout, grade, title style
  and photo for a fresh cover.

## How to run

```sh
node serve.ts
```

Open http://localhost:8080 — pick a photo, pick a layout and a grade,
write the title, export a PNG. No build step, no network, no upload.

To re-shoot the screenshots (the same four the entry ships):

```sh
node app/src/shots.js
```

It starts the server, drives headless Chromium, captures the four shots
into `screenshots/` and writes `shots.json`.

To build the hand-in (what the grader runs):

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## How it works

- `app/src/cover.js` — the cover engine: 9 layouts, 6 gradient-map
  grades, Poster Ink, the retro sun, palm silhouettes and the title
  block, all drawn on a 2D canvas.
- `app/src/main.js` — the editor: photos, panels, zoom and pan,
  exports, self-test and the `?shot=` modes the screenshot runner uses.
- `app/src/shots.js` — the screenshot runner (headless Chromium over
  its debugging protocol, JPEG captures, `shots.json` manifest).
- `main.ts` — copies `app/` and `screenshots/` to the output directory
  and writes `dossier.json` with the kit's `buildDossier`.
- `serve.ts` — the local static server for trying the app.

## Notes

Fan-made and original: no Rockstar Games logo, artwork, character or
font appears anywhere. Lettering uses system fonts; the six sample
photos were made with an image model for this entry. License: MIT —
see `LICENSE`.
