// Vice Cover — cover rendering engine.
// Draws a GTA-style multi-panel poster from photos on a 2D canvas:
// panels, gradient-map colour grades, a poster-ink pass, a retro sun,
// palm silhouettes and a big outlined title block. No network, no fonts
// to fetch: every letter is drawn with system fonts.

export const VICE_LAYOUTS = [
  {
    id: "hero",
    label: "Hero",
    panels: [{ x: 0, y: 0, w: 1, h: 1 }],
  },
  {
    id: "triptych",
    label: "Triptych",
    panels: [
      { x: 0, y: 0, w: 0.32, h: 1 },
      { x: 0.34, y: 0, w: 0.32, h: 1 },
      { x: 0.68, y: 0, w: 0.32, h: 1 },
    ],
  },
  {
    id: "quad",
    label: "Quad",
    panels: [
      { x: 0, y: 0, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0, w: 0.49, h: 0.49 },
      { x: 0, y: 0.51, w: 0.49, h: 0.49 },
      { x: 0.51, y: 0.51, w: 0.49, h: 0.49 },
    ],
  },
  {
    id: "strips",
    label: "Strips",
    panels: [
      { x: 0, y: 0, w: 0.184, h: 1 },
      { x: 0.204, y: 0, w: 0.184, h: 1 },
      { x: 0.408, y: 0, w: 0.184, h: 1 },
      { x: 0.612, y: 0, w: 0.184, h: 1 },
      { x: 0.816, y: 0, w: 0.184, h: 1 },
    ],
  },
  {
    id: "split",
    label: "Split",
    panels: [
      { x: 0, y: 0, w: 0.58, h: 1 },
      { x: 0.6, y: 0, w: 0.4, h: 0.49 },
      { x: 0.6, y: 0.51, w: 0.4, h: 0.49 },
    ],
  },
  {
    id: "heroTop",
    label: "Hero Top",
    panels: [
      { x: 0, y: 0, w: 1, h: 0.6 },
      { x: 0, y: 0.62, w: 0.32, h: 0.38 },
      { x: 0.34, y: 0.62, w: 0.32, h: 0.38 },
      { x: 0.68, y: 0.62, w: 0.32, h: 0.38 },
    ],
  },
  {
    id: "mosaic",
    label: "Mosaic",
    panels: [
      { x: 0, y: 0, w: 1, h: 0.23 },
      { x: 0, y: 0.25, w: 0.28, h: 0.5 },
      { x: 0.3, y: 0.25, w: 0.4, h: 0.5 },
      { x: 0.72, y: 0.25, w: 0.28, h: 0.5 },
      { x: 0, y: 0.77, w: 1, h: 0.23 },
    ],
  },
  {
    id: "diagonal",
    label: "Diagonal",
    panels: [
      { points: [[0, 0], [1, 0], [0, 1]] },
      { points: [[1, 0], [1, 1], [0, 1]] },
    ],
  },
  {
    id: "duo",
    label: "Duo",
    panels: [
      { x: 0, y: 0, w: 1, h: 0.54 },
      { x: 0, y: 0.56, w: 1, h: 0.44 },
    ],
  },
];

// A grade is a list of [stop, colour] pairs that a pixel's brightness
// walks through: shadows land on the first colour, highlights on the last.
export const VICE_GRADES = [
  {
    id: "sunset",
    label: "Vice Sunset",
    stops: [
      [0, "#160a2e"],
      [0.28, "#7b2d8b"],
      [0.55, "#ff4d6d"],
      [0.8, "#ff9a3d"],
      [1, "#ffe66d"],
    ],
  },
  {
    id: "neon",
    label: "Neon Pink",
    stops: [
      [0, "#0d0221"],
      [0.3, "#3d0c6e"],
      [0.55, "#d633ff"],
      [0.8, "#ff2e88"],
      [1, "#7df9ff"],
    ],
  },
  {
    id: "dusk",
    label: "Teal Dusk",
    stops: [
      [0, "#04141f"],
      [0.3, "#0b3d4d"],
      [0.55, "#12808a"],
      [0.8, "#3ec1a7"],
      [1, "#c8f7d4"],
    ],
  },
  {
    id: "gold",
    label: "Gold Hour",
    stops: [
      [0, "#160f02"],
      [0.3, "#5a3a08"],
      [0.55, "#c47f17"],
      [0.8, "#f5b942"],
      [1, "#fff3b0"],
    ],
  },
  {
    id: "magenta",
    label: "Magenta Night",
    stops: [
      [0, "#12001f"],
      [0.3, "#4a0a5e"],
      [0.55, "#a4139c"],
      [0.8, "#ff4da6"],
      [1, "#ffd6f2"],
    ],
  },
  {
    id: "mono",
    label: "Mono Ink",
    stops: [
      [0, "#000000"],
      [0.35, "#3a3a3a"],
      [0.65, "#8a8a8a"],
      [1, "#ffffff"],
    ],
  },
];

export const VICE_TITLE_STYLES = [
  { id: "gradient", label: "Gradient" },
  { id: "neon", label: "Neon" },
  { id: "outline", label: "Outline" },
];

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Turns a grade's stops into three 256-entry lookup tables, one per
// channel, so grading a photo is a single pass over its pixels.
export function buildGradeLut(grade) {
  const lutR = new Uint8Array(256);
  const lutG = new Uint8Array(256);
  const lutB = new Uint8Array(256);
  const stops = grade.stops.map(([t, hex]) => [t, hexToRgb(hex)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let a = stops[0];
    let b = stops[stops.length - 1];
    for (let s = 0; s < stops.length - 1; s++) {
      if (t >= stops[s][0] && t <= stops[s + 1][0]) {
        a = stops[s];
        b = stops[s + 1];
        break;
      }
    }
    const span = b[0] - a[0] || 1;
    const k = clamp01((t - a[0]) / span);
    lutR[i] = Math.round(a[1][0] + (b[1][0] - a[1][0]) * k);
    lutG[i] = Math.round(a[1][1] + (b[1][1] - a[1][1]) * k);
    lutB[i] = Math.round(a[1][2] + (b[1][2] - a[1][2]) * k);
  }
  return { r: lutR, g: lutG, b: lutB };
}

function panelBox(panel, W, H) {
  if (panel.points) {
    const xs = panel.points.map((p) => p[0] * W);
    const ys = panel.points.map((p) => p[1] * H);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return {
      x: x0,
      y: y0,
      w: Math.max(...xs) - x0,
      h: Math.max(...ys) - y0,
    };
  }
  return { x: panel.x * W, y: panel.y * H, w: panel.w * W, h: panel.h * H };
}

function tracePanel(ctx, panel, W, H) {
  ctx.beginPath();
  if (panel.points) {
    panel.points.forEach(([px, py], i) => {
      if (i === 0) ctx.moveTo(px * W, py * H);
      else ctx.lineTo(px * W, py * H);
    });
    ctx.closePath();
  } else {
    ctx.rect(panel.x * W, panel.y * H, panel.w * W, panel.h * H);
  }
}

// Cover-fit: scale the photo so it fills the panel, then shift it by the
// pan offsets (fractions of the panel size, -0.5..0.5).
function fitPhoto(img, pw, ph, zoom, ox, oy) {
  // A canvas works as a photo too (the self-test draws one), so fall back
  // to its width and height when naturalWidth is absent.
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.max(pw / iw, ph / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  return {
    dx: (pw - dw) / 2 + ox * pw,
    dy: (ph - dh) / 2 + oy * ph,
    dw,
    dh,
  };
}

// Grades one panel's pixels in place: brightness walks the grade's
// lookup tables. Poster Ink first flattens brightness into six flat
// bands, so the photo reads as flat poster colour.
function gradePanel(ctx, w, h, lut, ink) {
  const image = ctx.getImageData(0, 0, w, h);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    let lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) | 0;
    if (ink) lum = Math.round(lum / 51) * 51;
    if (lum > 255) lum = 255;
    d[i] = lut.r[lum];
    d[i + 1] = lut.g[lum];
    d[i + 2] = lut.b[lum];
  }
  ctx.putImageData(image, 0, 0);
}

function drawRetroSun(ctx, cx, cy, r) {
  const sun = document.createElement("canvas");
  sun.width = Math.ceil(r * 2);
  sun.height = Math.ceil(r * 2);
  const s = sun.getContext("2d");
  const grad = s.createLinearGradient(0, 0, 0, r * 2);
  grad.addColorStop(0, "#ffd319");
  grad.addColorStop(0.55, "#ff7a3d");
  grad.addColorStop(1, "#ff2975");
  s.fillStyle = grad;
  s.beginPath();
  s.arc(r, r, r, 0, Math.PI * 2);
  s.fill();
  // Cut the slats out of the sun's lower half.
  s.globalCompositeOperation = "destination-out";
  let y = r * 1.05;
  let thick = r * 0.07;
  while (y < r * 2) {
    s.fillRect(0, y, r * 2, thick);
    y += thick + r * 0.13;
    thick += r * 0.02;
  }
  ctx.drawImage(sun, cx - r, cy - r);
}

function drawPalm(ctx, baseX, baseY, h, lean) {
  const topX = baseX + lean * h;
  const topY = baseY - h;
  ctx.save();
  ctx.strokeStyle = "#14041f";
  ctx.lineCap = "round";
  // Trunk, leaning gently.
  ctx.lineWidth = Math.max(3, h * 0.045);
  ctx.beginPath();
  ctx.moveTo(baseX, baseY);
  ctx.quadraticCurveTo(baseX + lean * h * 0.4, baseY - h * 0.55, topX, topY);
  ctx.stroke();
  // Seven fronds fanning out from the crown.
  ctx.lineWidth = Math.max(2, h * 0.028);
  for (let i = 0; i < 7; i++) {
    const spread = -1.15 + (i / 6) * 2.3;
    const tipX = topX + Math.sin(spread) * h * 0.48;
    const tipY = topY + (1 - Math.cos(spread)) * h * 0.16 + h * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.sin(spread) * h * 0.28, topY - h * 0.1, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBird(ctx, x, y, s) {
  ctx.save();
  ctx.strokeStyle = "#1a0b2e";
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - s, y + s * 0.3);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.5, x, y + s * 0.2);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.5, x + s, y + s * 0.3);
  ctx.stroke();
  ctx.restore();
}

function fitTitleFont(ctx, text, maxPx, maxWidth) {
  let px = maxPx;
  const family = '"Arial Black", Arial, sans-serif';
  for (;;) {
    ctx.font = "900 " + px + "px " + family;
    ctx.letterSpacing = Math.round(px * 0.03) + "px";
    if (ctx.measureText(text).width <= maxWidth || px <= 18) return { px, family };
    px = Math.floor(px * 0.92);
  }
}

function drawTitleBlock(ctx, W, H, opts) {
  const title = (opts.title || "VICE COVER").toUpperCase();
  const subtitle = opts.subtitle || "";
  const caption = opts.caption || "";
  // Dark scrim so the lettering reads over any photo.
  const scrim = ctx.createLinearGradient(0, H * 0.55, 0, H);
  scrim.addColorStop(0, "rgba(12,2,24,0)");
  scrim.addColorStop(1, "rgba(12,2,24,0.82)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  const titleBase = H * 0.895;
  const fitted = fitTitleFont(ctx, title, H * 0.115, W * 0.94);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (caption) {
    ctx.font = "700 " + Math.round(H * 0.026) + "px Arial, sans-serif";
    ctx.letterSpacing = Math.round(H * 0.008) + "px";
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillText(caption.toUpperCase(), W / 2, titleBase - fitted.px - H * 0.035);
  }
  ctx.font = "900 " + fitted.px + "px " + fitted.family;
  ctx.letterSpacing = Math.round(fitted.px * 0.03) + "px";
  if (opts.titleStyle === "neon") {
    ctx.shadowColor = "#ff2e88";
    ctx.shadowBlur = fitted.px * 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, W / 2, titleBase);
    ctx.fillText(title, W / 2, titleBase);
    ctx.shadowBlur = 0;
  } else if (opts.titleStyle === "outline") {
    ctx.fillStyle = "rgba(10,2,20,0.35)";
    ctx.fillText(title, W / 2, titleBase);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = Math.max(2, fitted.px * 0.06);
    ctx.strokeText(title, W / 2, titleBase);
  } else {
    const fill = ctx.createLinearGradient(0, titleBase - fitted.px, 0, titleBase);
    fill.addColorStop(0, "#ffe66d");
    fill.addColorStop(0.5, "#ff9a3d");
    fill.addColorStop(1, "#ff2e88");
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#160a2e";
    ctx.lineWidth = Math.max(3, fitted.px * 0.09);
    ctx.strokeText(title, W / 2, titleBase);
    ctx.fillStyle = fill;
    ctx.fillText(title, W / 2, titleBase);
  }
  if (subtitle) {
    ctx.font = "italic 700 " + Math.round(H * 0.042) + "px 'Segoe Script', 'Brush Script MT', cursive";
    ctx.letterSpacing = "0px";
    ctx.shadowColor = "#ff2e88";
    ctx.shadowBlur = H * 0.015;
    ctx.fillStyle = "#ffd7f2";
    ctx.fillText(subtitle, W / 2, H * 0.95);
    ctx.shadowBlur = 0;
  }
  ctx.font = "600 " + Math.max(11, Math.round(H * 0.014)) + "px Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText("FAN-MADE • NOT AFFILIATED WITH ROCKSTAR GAMES", W / 2, H * 0.985);
}

// The whole cover, drawn onto any 2D context at any size.
// opts: layout, grade, ink, titleStyle, title, subtitle, caption,
// images (one per panel), zooms, pans.
export function drawViceCover(ctx, W, H, opts) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#f5efe6";
  ctx.fillRect(0, 0, W, H);
  const lut = buildGradeLut(opts.grade);
  opts.layout.panels.forEach((panel, i) => {
    const box = panelBox(panel, W, H);
    const pw = Math.max(2, Math.round(box.w));
    const ph = Math.max(2, Math.round(box.h));
    const off = document.createElement("canvas");
    off.width = pw;
    off.height = ph;
    const octx = off.getContext("2d");
    const img = opts.images && opts.images[i];
    octx.save();
    octx.beginPath();
    if (panel.points) {
      panel.points.forEach(([px, py], k) => {
        const x = px * W - box.x;
        const y = py * H - box.y;
        if (k === 0) octx.moveTo(x, y);
        else octx.lineTo(x, y);
      });
      octx.closePath();
    } else {
      octx.rect(0, 0, pw, ph);
    }
    octx.clip();
    if (img && (img.naturalWidth || img.width)) {
      const zoom = (opts.zooms && opts.zooms[i]) || 1;
      const pan = (opts.pans && opts.pans[i]) || { x: 0, y: 0 };
      const fit = fitPhoto(img, pw, ph, zoom, pan.x, pan.y);
      octx.drawImage(img, fit.dx, fit.dy, fit.dw, fit.dh);
    } else {
      const placeholder = octx.createLinearGradient(0, 0, pw, ph);
      placeholder.addColorStop(0, "#2a0a3d");
      placeholder.addColorStop(1, "#ff2e88");
      octx.fillStyle = placeholder;
      octx.fillRect(0, 0, pw, ph);
    }
    octx.restore();
    gradePanel(octx, pw, ph, lut, !!opts.ink);
    ctx.save();
    tracePanel(ctx, panel, W, H);
    ctx.clip();
    ctx.drawImage(off, box.x, box.y);
    ctx.restore();
    if (opts.ink) {
      ctx.save();
      tracePanel(ctx, panel, W, H);
      ctx.strokeStyle = "#160a2e";
      ctx.lineWidth = Math.max(2, W * 0.002);
      ctx.stroke();
      ctx.restore();
    }
  });
  const sunR = Math.min(W, H) * 0.13;
  drawRetroSun(ctx, W * 0.8, H * 0.2, sunR);
  drawBird(ctx, W * 0.15, H * 0.1, Math.min(W, H) * 0.018);
  drawBird(ctx, W * 0.24, H * 0.07, Math.min(W, H) * 0.014);
  drawBird(ctx, W * 0.55, H * 0.06, Math.min(W, H) * 0.012);
  drawPalm(ctx, W * 0.05, H * 0.99, H * 0.52, 0.22);
  drawPalm(ctx, W * 0.96, H * 0.99, H * 0.42, -0.2);
  drawPalm(ctx, W * 0.32, H * 0.99, H * 0.26, 0.12);
  drawTitleBlock(ctx, W, H, opts);
  ctx.restore();
}

// A small procedural photo for the self-test: sunset stripes, so every
// layout has something to grade and draw.
export function makeTestImage(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#ff9a3d");
  g.addColorStop(0.5, "#7b2d8b");
  g.addColorStop(1, "#12808a");
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  x.fillStyle = "#ffe66d";
  x.beginPath();
  x.arc(w * 0.7, h * 0.3, h * 0.18, 0, Math.PI * 2);
  x.fill();
  // Return the canvas itself: it draws synchronously, so the self-test
  // never races an image load.
  return c;
}

// Renders every layout once at a small size and reports which survived.
// The editor's self-test button runs this and prints the tally.
export function selfTestCover() {
  const probe = document.createElement("canvas");
  probe.width = 480;
  probe.height = 270;
  const ctx = probe.getContext("2d");
  const testImg = makeTestImage(480, 270);
  const failures = [];
  for (const layout of VICE_LAYOUTS) {
    try {
      drawViceCover(ctx, 480, 270, {
        layout,
        grade: VICE_GRADES[0],
        ink: false,
        titleStyle: "gradient",
        title: "TEST",
        subtitle: "self-test",
        caption: "",
        images: layout.panels.map(() => testImg),
        zooms: layout.panels.map(() => 1),
        pans: layout.panels.map(() => ({ x: 0, y: 0 })),
      });
      const px = ctx.getImageData(240, 135, 1, 1).data;
      if (px[3] !== 255) throw new Error("blank pixel at centre");
    } catch (err) {
      failures.push({ layout: layout.id, error: String(err && err.message ? err.message : err) });
    }
  }
  return { total: VICE_LAYOUTS.length, passed: VICE_LAYOUTS.length - failures.length, failures };
}
