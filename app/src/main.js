// VICE COVER v3 — wires the editor page: library + upload + drag-drop, 9 layouts,
// 6 grades, 3 title styles, per-panel crop/pan/zoom, Surprise me, PNG export in 3 sizes.
// Renderer (cover.js) draws the cover; shots.js provides the fixed ?shot= scenes.
// This file codes against their exact interfaces: drawCover(canvas, photos, opts)
// and runShot(shot, query, apply) where apply receives
// { photo, caption, subtitle, layout, grade, titleStyle }.
import { drawCover } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const photoInput = document.getElementById('photo');
const dropzone = document.getElementById('dropzone');
const zoomSlider = document.getElementById('zoom');

const SAMPLE_NAMES = ['beach', 'palms', 'neon', 'skyline', 'sunset', 'street'];
const TITLES = [
  'Sunset Heist', 'Boulevard Queen', 'Vice City Nights', 'Neon Drive',
  'Palms & Pistols', 'Ocean Drive', 'Midnight Run', 'Vice Heist',
  'Golden Hour', 'Street Kings', 'Turbo Vice', 'Coconut Grove',
];

// One centred, unzoomed crop per panel slot; shared by state init and Surprise me.
function freshCrops() {
  return Array.from({ length: 5 }, () => ({ x: 0.5, y: 0.5, zoom: 1 }));
}

const state = {
  layout: 'classic',
  grade: 'sunset',
  titleStyle: 'gradient',
  title: captionInput.value || 'Sunset Heist',
  subtitle: subtitleInput.value || 'Vice City Nights',
  photos: [null, null, null, null, null],
  selectedPanel: 0,
  crops: freshCrops(),
};

// Keep the layout / grade / title-style picker buttons in sync with state,
// so any path that changes state (picker click, Surprise me, ?shot= apply)
// is reflected in the highlighted buttons.
function syncPickerButtons() {
  const groups = [
    ['layouts', 'layout', 'layout'],
    ['grades', 'grade', 'grade'],
    ['title-styles', 'titleStyle', 'titleStyle'],
  ];
  groups.forEach(([containerId, attr, key]) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('button').forEach((b) => {
      b.classList.toggle('active', b.dataset[attr] === state[key]);
    });
  });
}

function redraw() {
  drawCover(canvas, state.photos, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleStyle: state.titleStyle,
    crops: state.crops,
  });
  syncPickerButtons();
}

function setStatus(text) {
  status.textContent = text;
}

/** Loads an image from a URL, resolving to the image once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function selectPanel(index) {
  state.selectedPanel = index;
  document.querySelectorAll('.panel-slot').forEach((btn) => {
    btn.classList.toggle('selected', Number(btn.dataset.panel) === index);
  });
  zoomSlider.value = String(state.crops[index].zoom);
}

async function assignPhotoToSelected(img, label) {
  state.photos[state.selectedPanel] = img;
  redraw();
  setStatus(`Panel ${state.selectedPanel + 1}: ${label}`);
}

async function loadSample(name) {
  try {
    const img = await loadImage(`./samples/${name}.jpg`);
    await assignPhotoToSelected(img, name);
  } catch (err) {
    setStatus(`Could not load sample ${name}.`);
  }
}

async function loadUserFile(file) {
  if (!file || !file.type.startsWith('image/')) return;
  try {
    const img = await loadImage(URL.createObjectURL(file));
    await assignPhotoToSelected(img, file.name);
  } catch (err) {
    setStatus('Could not load that photo.');
  }
}

// --- Library thumbnails ---
document.querySelectorAll('.thumb').forEach((btn) => {
  btn.addEventListener('click', () => loadSample(btn.dataset.photo));
});

// --- File input + drag-drop ---
photoInput.addEventListener('change', async (e) => {
  await loadUserFile(e.target.files[0]);
  e.target.value = '';
});
['dragover', 'dragenter'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragging');
  });
});
['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragging');
  });
});
dropzone.addEventListener('drop', async (e) => {
  await loadUserFile(e.dataTransfer.files[0]);
});
canvas.addEventListener('dragover', (e) => e.preventDefault());
canvas.addEventListener('drop', async (e) => {
  e.preventDefault();
  await loadUserFile(e.dataTransfer.files[0]);
});

// --- Panel selector ---
document.querySelectorAll('.panel-slot').forEach((btn) => {
  btn.addEventListener('click', () => selectPanel(Number(btn.dataset.panel)));
});

// --- Caption / subtitle ---
captionInput.addEventListener('input', () => {
  state.title = captionInput.value;
  redraw();
});
subtitleInput.addEventListener('input', () => {
  state.subtitle = subtitleInput.value;
  redraw();
});

// --- Pickers: layout / grade / title style ---
function wirePicker(containerId, attr, key) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('button').forEach((btn) => {
    if (btn.dataset[attr] === state[key]) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state[key] = btn.dataset[attr];
      syncPickerButtons();
      redraw();
    });
  });
}
wirePicker('layouts', 'layout', 'layout');
wirePicker('grades', 'grade', 'grade');
wirePicker('title-styles', 'titleStyle', 'titleStyle');

// --- Zoom slider ---
zoomSlider.addEventListener('input', () => {
  state.crops[state.selectedPanel].zoom = Number(zoomSlider.value);
  redraw();
});

// --- Drag on canvas pans the selected panel's photo ---
let dragging = false;
let lastX = 0;
let lastY = 0;
canvas.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  const rect = canvas.getBoundingClientRect();
  const crop = state.crops[state.selectedPanel];
  const zoom = crop.zoom || 1;
  crop.x = Math.min(1, Math.max(0, crop.x - (e.clientX - lastX) / rect.width / zoom));
  crop.y = Math.min(1, Math.max(0, crop.y - (e.clientY - lastY) / rect.height / zoom));
  lastX = e.clientX;
  lastY = e.clientY;
  redraw();
});
function endDrag() { dragging = false; }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

// --- Surprise me ---
document.getElementById('surprise').addEventListener('click', async () => {
  const layouts = ['classic', 'split', 'single', 'quad', 'strip', 'hero-side', 'hero-top', 'mosaic', 'diagonal'];
  const grades = ['sunset', 'neon', 'noir', 'pastel', 'poster-ink', 'skin-safe'];
  const titleStyles = ['gradient', 'neon', 'outline'];
  state.layout = layouts[Math.floor(Math.random() * layouts.length)];
  state.grade = grades[Math.floor(Math.random() * grades.length)];
  state.titleStyle = titleStyles[Math.floor(Math.random() * titleStyles.length)];
  state.title = TITLES[Math.floor(Math.random() * TITLES.length)];
  captionInput.value = state.title;
  // Random photos: shuffle the 6 samples, fill up to 5 panels, and reset every
  // panel's crop to centred/unzoomed so a previous pan never leaks into the new art.
  const shuffled = [...SAMPLE_NAMES].sort(() => Math.random() - 0.5);
  const count = 1 + Math.floor(Math.random() * 5);
  for (let i = 0; i < 5; i += 1) {
    if (i < count) {
      try {
        state.photos[i] = await loadImage(`./samples/${shuffled[i]}.jpg`);
      } catch (err) {
        state.photos[i] = null;
      }
    } else {
      state.photos[i] = null;
    }
    state.crops[i] = freshCrops()[i];
  }
  zoomSlider.value = '1';
  syncPickerButtons();
  redraw();
  setStatus(`Surprise: ${state.title} — ${state.layout} / ${state.grade} / ${state.titleStyle}`);
});

// --- Export: render current state to an offscreen canvas at the exact size ---
function exportCover(width, height) {
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  drawCover(off, state.photos, {
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    titleStyle: state.titleStyle,
    crops: state.crops,
  });
  const name = `cover-${width}x${height}.png`;
  off.toBlob((blob) => {
    if (!blob) { setStatus('Export failed.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    setStatus(`Saved ${name}`);
  }, 'image/png');
}
// The ids name the export slot; the sizes are the ones the README promises.
document.getElementById('export-1080').addEventListener('click', () => exportCover(1920, 1080));
document.getElementById('export-1350').addEventListener('click', () => exportCover(1080, 1350));
document.getElementById('export-1920').addEventListener('click', () => exportCover(1080, 1080));

// --- ?shot= support ---
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (scene) => {
    // Scene fields arrive with defaults already applied by runShot (see shots.js).
    const { photo, caption, subtitle, layout, grade, titleStyle } = scene;
    if (photo) {
      try {
        const img = await loadImage(`./samples/${photo}.jpg`);
        // Shot scenes are photo-led collages: the same shot photo fills
        // every panel, panned across it so it reads as one continuous
        // image, not a repeated tile. Normal editor behaviour (user assigns
        // photos per panel) is untouched — this is the ?shot= path only.
        for (let i = 0; i < 5; i += 1) {
          state.photos[i] = img;
          state.crops[i] = { x: 0.15 + 0.17 * i, y: 0.5, zoom: 1.25 };
        }
      } catch (err) {
        for (let i = 0; i < 5; i += 1) state.photos[i] = null;
      }
    }
    if (caption) { state.title = caption; captionInput.value = caption; }
    if (subtitle) { state.subtitle = subtitle; subtitleInput.value = subtitle; }
    if (layout) state.layout = layout;
    if (grade) state.grade = grade;
    if (titleStyle) state.titleStyle = titleStyle;
    redraw();
  });
} else {
  // Default: load the beach sample into panel 1 so the editor opens with art.
  loadSample('beach');
  redraw();
}
