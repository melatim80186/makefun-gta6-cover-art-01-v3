// GTA 6 poster-style cover renderer (own art only, system fonts, no external assets).
// Panels are fractions of the canvas (x, y, w, h in 0..1); diagonal panels use
// `points` (fractional polygon vertices) instead of a rect.
// drawCover(canvas, photos, opts): photos[i] is the image for panel slot i (or null).
// opts = { layout, grade, title, subtitle, titleStyle, crops } with
// crops[i] = { x, y, zoom } (pan 0..1, zoom >= 1).

export const LAYOUTS = [
  { id: 'classic', name: 'Classic triptych', panels: [
    { x: 0, y: 0, w: 0.28, h: 1 },
    { x: 0.28, y: 0, w: 0.44, h: 1 },
    { x: 0.72, y: 0, w: 0.28, h: 1 },
  ] },
  { id: 'split', name: 'Split duo', panels: [
    { x: 0, y: 0, w: 0.5, h: 1 },
    { x: 0.5, y: 0, w: 0.5, h: 1 },
  ] },
  { id: 'single', name: 'Single hero', panels: [
    { x: 0, y: 0, w: 1, h: 1 },
  ] },
  { id: 'quad', name: 'Quad grid', panels: [
    { x: 0, y: 0, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0, w: 0.5, h: 0.5 },
    { x: 0, y: 0.5, w: 0.5, h: 0.5 },
    { x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
  ] },
  { id: 'strip', name: 'Film strip', panels: [
    { x: 0, y: 0, w: 1, h: 0.25 },
    { x: 0, y: 0.25, w: 1, h: 0.25 },
    { x: 0, y: 0.5, w: 1, h: 0.25 },
    { x: 0, y: 0.75, w: 1, h: 0.25 },
  ] },
  { id: 'hero-side', name: 'Hero left', panels: [
    { x: 0, y: 0, w: 0.62, h: 1 },
    { x: 0.62, y: 0, w: 0.38, h: 0.5 },
    { x: 0.62, y: 0.5, w: 0.38, h: 0.5 },
  ] },
  { id: 'hero-top', name: 'Hero top', panels: [
    { x: 0, y: 0, w: 1, h: 0.62 },
    { x: 0, y: 0.62, w: 0.5, h: 0.38 },
    { x: 0.5, y: 0.62, w: 0.5, h: 0.38 },
  ] },
  { id: 'mosaic', name: 'Mosaic', panels: [
    { x: 0, y: 0, w: 0.3, h: 0.5 },
    { x: 0, y: 0.5, w: 0.3, h: 0.5 },
    { x: 0.3, y: 0.2, w: 0.4, h: 0.6 },
    { x: 0.7, y: 0, w: 0.3, h: 0.5 },
    { x: 0.7, y: 0.5, w: 0.3, h: 0.5 },
  ] },
  { id: 'diagonal', name: 'Diagonal split', panels: [
    { points: [[0, 0], [0.45, 0], [0.25, 1], [0, 1]] },
    { points: [[0.45, 0], [0.8, 0], [0.6, 1], [0.25, 1]] },
    { points: [[0.8, 0], [1, 0], [1, 1], [0.6, 1]] },
  ] },
];

export const GRADES = [
  { id: 'sunset', name: 'Sunset', ramp: ['#1a0b2e', '#7b1e5b', '#ff5e3a', '#ff2e88', '#ffd166'] },
  { id: 'neon', name: 'Neon nights', ramp: ['#001018', '#003a4d', '#00e5ff', '#ff00e5', '#f2f2ff'] },
  { id: 'noir', name: 'Palm noir', filter: 'grayscale(0.85) contrast(1.28) brightness(0.96) sepia(0.18)' },
  { id: 'pastel', name: 'Pastel vice', filter: 'saturate(0.75) brightness(1.1) contrast(0.92) hue-rotate(-12deg)' },
  { id: 'poster-ink', name: 'Poster ink', ramp: ['#0d0d12', '#2b2b3a', '#c22e2e', '#ff5a3c', '#ffe9c9'], posterize: 6 },
  { id: 'skin-safe', name: 'Skin-safe warm', filter: 'saturate(1.05) brightness(1.03)' },
];

export const TITLE_STYLES = [
  { id: 'gradient', name: 'Gradient title' },
  { id: 'neon', name: 'Neon script' },
  { id: 'outline', name: 'Poster outline' },
];

// ---- colour helpers -------------------------------------------------------
function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Build a 256-entry luminance -> RGB lookup from a colour ramp.
function buildLut(ramp, posterize) {
  const stops = ramp.map(hexRgb);
  const lut = new Uint8Array(256 * 3);
  for (let i = 0; i < 256; i++) {
    let t = i / 255;
    if (posterize) t = Math.floor(t * posterize) / (posterize - 1 || 1);
    const pos = t * (stops.length - 1);
    const k = Math.min(stops.length - 2, Math.floor(pos));
    const f = pos - k;
    const a = stops[k];
    const b = stops[k + 1];
    lut[i * 3] = Math.round(a[0] + (b[0] - a[0]) * f);
    lut[i * 3 + 1] = Math.round(a[1] + (b[1] - a[1]) * f);
    lut[i * 3 + 2] = Math.round(a[2] + (b[2] - a[2]) * f);
  }
  return lut;
}

// True gradient-map: every pixel's luminance is remapped through the ramp.
function applyGradientMap(ctx, w, h, grade) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const lut = buildLut(grade.ramp, grade.posterize || 0);
  for (let i = 0; i < d.length; i += 4) {
    const lum = Math.round(0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]);
    d[i] = lut[lum * 3];
    d[i + 1] = lut[lum * 3 + 1];
    d[i + 2] = lut[lum * 3 + 2];
  }
  ctx.putImageData(img, 0, 0);
}

// Skin-safe: warm the skin-luminance band (lum ~0.35-0.78, red-dominant pixels)
// at reduced strength, everything else barely touched.
function applySkinSafe(ctx, w, h) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const skinLike = r > g && g >= b ? 1 : 0;
    const inBand = lum > 0.32 && lum < 0.8 ? 1 : 0;
    const strength = 0.38 * skinLike * inBand + 0.08;
    d[i] = Math.min(255, r + 22 * strength);
    d[i + 1] = Math.min(255, g + 6 * strength);
    d[i + 2] = Math.max(0, b - 10 * strength);
  }
  ctx.putImageData(img, 0, 0);
}

function applyGrade(off, w, h, gradeId) {
  const grade = GRADES.find((g) => g.id === gradeId) || GRADES[0];
  const octx = off.getContext('2d');
  if (grade.ramp) {
    applyGradientMap(octx, w, h, grade);
  } else if (grade.id === 'skin-safe') {
    applySkinSafe(octx, w, h);
  } else if (grade.filter) {
    // Real canvas colour operation via a second pass with ctx.filter.
    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext('2d');
    tctx.filter = grade.filter;
    tctx.drawImage(off, 0, 0);
    octx.clearRect(0, 0, w, h);
    octx.drawImage(tmp, 0, 0);
  }
}

// ---- panel geometry -------------------------------------------------------
function panelRect(panel, w, h) {
  if (panel.points) {
    const xs = panel.points.map((p) => p[0]);
    const ys = panel.points.map((p) => p[1]);
    const x0 = Math.min(...xs);
    const y0 = Math.min(...ys);
    return { x: x0 * w, y: y0 * h, w: (Math.max(...xs) - x0) * w, h: (Math.max(...ys) - y0) * h };
  }
  return { x: panel.x * w, y: panel.y * h, w: panel.w * w, h: panel.h * h };
}

function clipPanel(ctx, panel, w, h) {
  ctx.beginPath();
  if (panel.points) {
    panel.points.forEach(([fx, fy], i) => {
      if (i === 0) ctx.moveTo(fx * w, fy * h);
      else ctx.lineTo(fx * w, fy * h);
    });
    ctx.closePath();
  } else {
    ctx.rect(panel.x * w, panel.y * h, panel.w * w, panel.h * h);
  }
  ctx.clip();
}

// Cover-fit draw of one photo into a panel rect, honouring {x, y, zoom}.
function drawPhotoCover(ctx, photo, rect, crop) {
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  if (!iw || !ih) return;
  const zoom = Math.max(1, (crop && crop.zoom) || 1);
  const px = crop && typeof crop.x === 'number' ? crop.x : 0.5;
  const py = crop && typeof crop.y === 'number' ? crop.y : 0.5;
  const scale = Math.max(rect.w / iw, rect.h / ih) * zoom;
  const dw = iw * scale;
  const dh = ih * scale;
  // Pan: 0 = show the left/top edge, 1 = show the right/bottom edge.
  const dx = rect.x + (rect.w - dw) * px;
  const dy = rect.y + (rect.h - dh) * py;
  ctx.drawImage(photo, dx, dy, dw, dh);
}

function placeholderGradient(ctx, rect, i) {
  const hues = [['#3b1d5a', '#ff5e3a'], ['#0b3a4d', '#00e5ff'], ['#4d1a2e', '#ff2e88'], ['#123524', '#7be0a3'], ['#2b2b3a', '#ffd166']];
  const [a, b] = hues[i % hues.length];
  const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  ctx.fillStyle = g;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  // Diagonal sheen so an empty slot still reads as a photo panel.
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + rect.h);
  ctx.lineTo(rect.x + rect.w * 0.5, rect.y);
  ctx.lineTo(rect.x + rect.w * 0.75, rect.y);
  ctx.lineTo(rect.x + rect.w * 0.25, rect.y + rect.h);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ---- procedural own-art (no Rockstar art, no logos) ------------------------
function drawRetroSun(ctx, cx, cy, r) {
  ctx.save();
  const g = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
  g.addColorStop(0, '#ffd166');
  g.addColorStop(0.55, '#ff7a3c');
  g.addColorStop(1, '#ff2e88');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Slits: punch horizontal gaps out of the lower half.
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 4; i++) {
    const y = cy + r * (0.08 + i * 0.2);
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, r * 0.045 + i * r * 0.012);
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(lean);
  ctx.scale(s, s);
  ctx.strokeStyle = 'rgba(12, 8, 18, 0.92)';
  ctx.fillStyle = 'rgba(12, 8, 18, 0.92)';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  // Trunk: gentle curve.
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -55, -4, -105);
  ctx.stroke();
  // Fronds: 7 arcs fanning from the crown.
  ctx.lineWidth = 5;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.08 + (i / 6) * 0.84);
    const tx = Math.cos(a) * 62 - 31;
    const ty = -105 - Math.sin(a) * 34;
    ctx.beginPath();
    ctx.moveTo(-4, -105);
    ctx.quadraticCurveTo(tx * 0.6, -105 - Math.sin(a) * 52, tx, ty);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSkyline(ctx, x, y, w, h) {
  // Deterministic pseudo-random so the same cover renders identically every time.
  let seed = 987654321;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  ctx.save();
  ctx.fillStyle = 'rgba(12, 8, 18, 0.85)';
  let bx = x;
  const base = y + h;
  while (bx < x + w) {
    const bw = w * (0.05 + rnd() * 0.06);
    const bh = h * (0.35 + rnd() * 0.65);
    ctx.fillRect(bx, base - bh, bw, bh);
    // Tiny lit windows.
    ctx.fillStyle = 'rgba(255, 209, 102, 0.85)';
    for (let wy = base - bh + 4; wy < base - 6; wy += 9) {
      for (let wx = bx + 3; wx < bx + bw - 3; wx += 8) {
        if (rnd() < 0.35) ctx.fillRect(wx, wy, 2.5, 3.5);
      }
    }
    ctx.fillStyle = 'rgba(12, 8, 18, 0.85)';
    bx += bw + w * 0.012;
  }
  ctx.restore();
}

function drawBird(ctx, x, y, s) {
  ctx.save();
  ctx.strokeStyle = 'rgba(12, 8, 18, 0.8)';
  ctx.lineWidth = Math.max(1.5, s * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, y);
  ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.7, x, y);
  ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.7, x + s, y);
  ctx.stroke();
  ctx.restore();
}

// ---- title ----------------------------------------------------------------
function fitFont(ctx, text, maxWidth, startSize, weight, family) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

function drawTracked(ctx, text, cx, y, tracking) {
  // Draw capitals one glyph at a time so tracking works in every browser.
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, text.length - 1);
  let x = cx - total / 2;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = prevAlign;
}

function drawTitle(ctx, w, h, title, subtitle, style) {
  const text = (title || '').trim();
  if (!text) return;
  const bandY = h * 0.78;
  // Legibility scrim across the title band.
  const scrim = ctx.createLinearGradient(0, bandY - h * 0.06, 0, h);
  scrim.addColorStop(0, 'rgba(10, 6, 16, 0)');
  scrim.addColorStop(0.35, 'rgba(10, 6, 16, 0.55)');
  scrim.addColorStop(1, 'rgba(10, 6, 16, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, bandY - h * 0.06, w, h * 0.22 + h * 0.06);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  if (style === 'neon') {
    const upper = text.toUpperCase();
    const size = fitFont(ctx, upper, w * 0.9, h * 0.11, '700', "'Brush Script MT', 'Segoe Script', 'Comic Sans MS', cursive");
    ctx.save();
    ctx.shadowColor = '#ff00e5';
    ctx.shadowBlur = size * 0.45;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(upper, w / 2, h - h * 0.16);
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = size * 0.2;
    ctx.fillStyle = '#ffe9fb';
    ctx.fillText(upper, w / 2, h - h * 0.16);
    ctx.restore();
  } else if (style === 'outline') {
    const upper = text.toUpperCase();
    let size = fitFont(ctx, upper, w * 0.86, h * 0.115, '900', "'Arial Black', 'Helvetica Neue', sans-serif");
    // fitFont measures the untracked width, but the tracked draw below adds
    // size*0.14 per glyph — shrink until the tracked total fits the band,
    // otherwise long titles (e.g. "VICE CITY NIGHTS") overflow the canvas.
    const outlineFamily = "'Arial Black', 'Helvetica Neue', sans-serif";
    const trackedTotal = (s) => {
      ctx.font = `900 ${s}px ${outlineFamily}`;
      return [...upper].reduce((a, ch) => a + ctx.measureText(ch).width, 0) + s * 0.14 * Math.max(0, upper.length - 1);
    };
    while (trackedTotal(size) > w * 0.86 && size > 10) size -= 2;
    ctx.font = `900 ${size}px ${outlineFamily}`;
    const tracking = size * 0.14;
    ctx.save();
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(10, 6, 16, 0.92)';
    ctx.lineJoin = 'round';
    // Stroke + fill per glyph via the tracked helper (stroke needs the same path).
    const widths = [...upper].map((ch) => ctx.measureText(ch).width);
    const total = widths.reduce((a, b) => a + b, 0) + tracking * Math.max(0, upper.length - 1);
    let x = w / 2 - total / 2;
    const prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    [...upper].forEach((ch, i) => {
      ctx.strokeText(ch, x, h - h * 0.16);
      ctx.fillText(ch, x, h - h * 0.16);
      x += widths[i] + tracking;
    });
    ctx.textAlign = prevAlign;
    ctx.restore();
  } else {
    // gradient: bold condensed capitals filled with a warm linear gradient.
    const upper = text.toUpperCase();
    const size = fitFont(ctx, upper, w * 0.9, h * 0.12, '900', "'Arial Black', 'Helvetica Neue', sans-serif");
    const grad = ctx.createLinearGradient(0, h - h * 0.28, 0, h - h * 0.1);
    grad.addColorStop(0, '#ffd166');
    grad.addColorStop(0.5, '#ff7a3c');
    grad.addColorStop(1, '#ff2e88');
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.04;
    ctx.fillStyle = grad;
    ctx.fillText(upper, w / 2, h - h * 0.16);
    ctx.restore();
  }

  const sub = (subtitle || '').trim();
  if (sub) {
    const subSize = fitFont(ctx, sub, w * 0.8, h * 0.038, '600', "'Helvetica Neue', Arial, sans-serif");
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.92;
    ctx.fillText(sub, w / 2, h - h * 0.085);
    ctx.globalAlpha = 1;
    void subSize;
  }
}

// ---- main entry ------------------------------------------------------------
export function drawCover(canvas, photos, opts = {}) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const o = opts || {};
  const layout = LAYOUTS.find((l) => l.id === o.layout) || LAYOUTS[0];
  const gradeId = o.grade || 'sunset';
  const titleStyle = o.titleStyle || 'gradient';
  const list = Array.isArray(photos) ? photos : (photos ? [photos] : []);
  const crops = Array.isArray(o.crops) ? o.crops : [];

  // Backdrop.
  ctx.fillStyle = '#140a1e';
  ctx.fillRect(0, 0, w, h);

  const border = Math.max(3, Math.round(Math.min(w, h) * 0.008));
  const gap = Math.max(2, Math.round(Math.min(w, h) * 0.006));

  layout.panels.forEach((panel, i) => {
    const rect = panelRect(panel, w, h);
    const pw = Math.max(2, Math.round(rect.w));
    const ph = Math.max(2, Math.round(rect.h));
    // Render this panel on an offscreen canvas so the grade is applied per panel.
    const off = document.createElement('canvas');
    off.width = pw;
    off.height = ph;
    const octx = off.getContext('2d');
    const photo = list[i] || null;
    if (photo) {
      drawPhotoCover(octx, photo, { x: 0, y: 0, w: pw, h: ph }, crops[i]);
    } else {
      placeholderGradient(octx, { x: 0, y: 0, w: pw, h: ph }, i);
    }
    applyGrade(off, pw, ph, gradeId);
    // Composite the graded panel through its (possibly diagonal) clip.
    ctx.save();
    clipPanel(ctx, panel, w, h);
    ctx.drawImage(off, rect.x, rect.y, rect.w, rect.h);
    // Subtle top light so panels keep depth after the grade.
    const sheen = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(0.25, 'rgba(255,255,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });

  // White GTA-poster borders around every panel + the outer frame.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = border;
  ctx.lineJoin = 'miter';
  layout.panels.forEach((panel) => {
    ctx.beginPath();
    if (panel.points) {
      panel.points.forEach(([fx, fy], i) => {
        if (i === 0) ctx.moveTo(fx * w, fy * h);
        else ctx.lineTo(fx * w, fy * h);
      });
      ctx.closePath();
    } else {
      const r = panelRect(panel, w, h);
      ctx.rect(r.x + gap / 2, r.y + gap / 2, r.w - gap, r.h - gap);
    }
    ctx.stroke();
  });
  ctx.lineWidth = Math.max(4, border * 1.5);
  ctx.strokeRect(border / 2, border / 2, w - border, h - border);
  ctx.restore();

  // Procedural own-art overlay: retro sun top-right, palms in the lower
  // corners, a low skyline along the foot, birds in the open sky.
  const s = Math.min(w, h);
  drawRetroSun(ctx, w * 0.82, h * 0.16, s * 0.11);
  drawPalm(ctx, w * 0.04, h * 0.74, s / 340, 0.18);
  drawPalm(ctx, w * 0.97, h * 0.76, s / 380, -0.22);
  drawSkyline(ctx, w * 0.06, h * 0.74, w * 0.88, h * 0.06);
  drawBird(ctx, w * 0.22, h * 0.1, s * 0.02);
  drawBird(ctx, w * 0.3, h * 0.14, s * 0.016);
  drawBird(ctx, w * 0.62, h * 0.08, s * 0.018);

  drawTitle(ctx, w, h, o.title, o.subtitle, titleStyle);

  // Small FAN-MADE footer, bottom centre.
  const footSize = Math.max(10, Math.round(h * 0.016));
  ctx.font = `700 ${footSize}px 'Helvetica Neue', Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText('FAN-MADE  •  NOT AFFILIATED WITH ROCKSTAR GAMES', w / 2, h - h * 0.018);
}
