# VICE COVER v3: photo-led poster collages, 9 layouts, 6 gradient-map grades + Poster Ink, gradient title + neon script, PNG export in 3 sizes

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/melatim80186/makefun-gta6-cover-art-01-v3/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/melatim80186/makefun-gta6-cover-art-01-v3/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

VICE COVER turns your photos and a caption into GTA 6 poster-style cover art, right in the browser — no uploads, no network, everything runs offline. Pick a layout, a grade, and a title style, then export a print-ready PNG.

## Features

- **9 multi-panel poster-collage layouts** — classic, split, single, quad, strip, hero-side, hero-top, mosaic, diagonal.
- **6 grades including gradient-map grades + Poster Ink + skin-safe** — sunset, neon, noir, pastel, poster-ink, skin-safe. Gradient-map grades recolour each photo through a cinematic ramp; Poster Ink gives a bold flat poster look; skin-safe keeps skin tones natural.
- **Gradient title + neon script + poster-formula lettering** — three title styles (gradient, neon, outline) with big poster lettering and a subtitle line.
- **Crop/pan/zoom per panel** — click a panel slot to select it, drag on the cover to pan its photo, use the zoom slider to zoom it.
- **Photo library of 6 Vice City samples + upload/drag-drop** — beach, palms, neon, skyline, sunset, street; or drop in your own photo.
- **Surprise me** — one click shuffles layout, grade, title style, photos, and title.
- **PNG export in 3 sizes** — 1920x1080 / 1080x1350 / 1080x1080, rendered from the current state at full resolution.

## How to run

```sh
node serve.ts
```

Then open http://localhost:8080 in your browser.

## How the dossier builds

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

This copies `app/` and `screenshots/` into the output directory and writes `dossier.json` there via the vendored make.fun library (`vendor/makefun-app.ts`). The dossier is what the scorer reads, so keep `main.ts` and the vendored library in sync.

## Photo credits

Sample photos (via Openverse):

- beach.jpg — "Miami Beach: Ocean Drive - Art Deco District", https://live.staticflickr.com/8621/16428473860_522b7cc2a1_b.jpg, CC BY-SA
- palms.jpg — "South Beach", https://live.staticflickr.com/3820/13253491854_b32e1696d5_b.jpg, CC BY
- neon.jpg — "Neon Clutter", https://live.staticflickr.com/140/391656842_5dbdc6ac67_b.jpg, CC BY
- sunset.jpg — "Sunset in Puerto Rico", https://live.staticflickr.com/8502/8358592847_af582c628d_b.jpg, CC BY
- street.jpg — "Miami Beach Mesoamerican Deco", https://live.staticflickr.com/4020/4719202587_7341a848f2_b.jpg, CC BY
- skyline.jpg — "Evening Hong Kong", https://live.staticflickr.com/3863/14862408852_224c1b05fc_b.jpg, CC0 (public domain)

## Notes

All art and fonts are original, created for this entry. The app works fully offline with system fonts only and no external resources. Not affiliated with Rockstar Games.

Competition: https://make.fun/bounty/gta6-cover-art-01
