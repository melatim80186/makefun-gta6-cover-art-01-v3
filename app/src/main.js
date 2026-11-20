// Vice Cover — editor logic.
// Wires the controls to the cover engine: sample photos and uploads,
// panel picking, zoom and drag-to-pan, layout / grade / title choices,
// the three PNG exports, the self-test and the screenshot modes the
// shot script drives (?shot=cover and ?shot=editor).

import { VICE_LAYOUTS, VICE_GRADES, VICE_TITLE_STYLES, drawViceCover, selfTestCover } from "./cover.js";

const SAMPLES = [
  { file: "skyline.jpg", label: "Skyline" },
  { file: "palms.jpg", label: "Palms" },
  { file: "beach.jpg", label: "Beach" },
  { file: "neon.jpg", label: "Neon" },
  { file: "sunset.jpg", label: "Sunset" },
  { file: "night.jpg", label: "City Night" },
];

const EXPORT_SIZES = [
  { id: "1920x1080", label: "1920×1080", w: 1920, h: 1080 },
  { id: "1080x1350", label: "1080×1350", w: 1080, h: 1350 },
  { id: "1080x1080", label: "1080×1080", w: 1080, h: 1080 },
];

const MAX_SLOTS = 5;

const state = {
  layout: "triptych",
  grade: "sunset",
  ink: false,
  titleStyle: "gradient",
  title: "SUNSET HEIST",
  subtitle: "Vice City Nights",
  caption: "",
  size: "1920x1080",
  selected: 0,
  zoom: 1.15,
  // One photo slot per panel the layouts can show; a slot holds its own
  // image plus its zoom and pan, so each panel crops independently.
  slots: Array.from({ length: MAX_SLOTS }, () => ({ img: null, zoom: 1.15, ox: 0, oy: 0 })),
};

const $ = (id) => document.getElementById(id);
const stage = $("stage");
const stageCtx = stage.getContext("2d");
let previewW = 960;
let previewH = 540;
let drawQueued = false;

function currentLayout() {
  return VICE_LAYOUTS.find((l) => l.id === state.layout) || VICE_LAYOUTS[0];
}

function currentGrade() {
  return VICE_GRADES.find((g) => g.id === state.grade) || VICE_GRADES[0];
}

function queueDraw() {
  if (drawQueued) return;
  drawQueued = true;
  requestAnimationFrame(() => {
    drawQueued = false;
    renderPreview();
  });
}

function renderPreview() {
  // In ?shot=cover mode the canvas belongs to the shot, not the editor:
  // a queued redraw (from a sample load finishing) must never resize it
  // back to the editor preview — that stretched the cover.
  if (document.body.classList.contains("shot-cover")) return;
  const size = EXPORT_SIZES.find((s) => s.id === state.size) || EXPORT_SIZES[0];
  const box = Math.min(960 / size.w, 640 / size.h);
  previewW = Math.round(size.w * box);
  previewH = Math.round(size.h * box);
  if (stage.width !== previewW || stage.height !== previewH) {
    stage.width = previewW;
    stage.height = previewH;
  }
  const layout = currentLayout();
  const images = layout.panels.map((_, i) => state.slots[i] && state.slots[i].img);
  drawViceCover(stageCtx, previewW, previewH, {
    layout,
    grade: currentGrade(),
    ink: state.ink,
    titleStyle: state.titleStyle,
    title: state.title,
    subtitle: state.subtitle,
    caption: state.caption,
    images,
    zooms: layout.panels.map((_, i) => state.slots[i].zoom),
    pans: layout.panels.map((_, i) => ({ x: state.slots[i].ox, y: state.slots[i].oy })),
  });
  refreshPanelRow();
  refreshButtons();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("could not load " + src));
    img.src = src;
  });
}

async function loadSampleIntoSlot(index, slot) {
  const sample = SAMPLES[index];
  const img = await loadImage("samples/" + sample.file);
  state.slots[slot].img = img;
  state.slots[slot].zoom = 1.15;
  state.slots[slot].ox = 0;
  state.slots[slot].oy = 0;
  queueDraw();
}

function setStatus(text) {
  const el = $("status");
  if (el) el.textContent = text;
}

function refreshPanelRow() {
  const row = $("panelRow");
  if (!row || row.children.length === 0) return;
  const count = currentLayout().panels.length;
  Array.from(row.children).forEach((btn, i) => {
    btn.classList.toggle("active", i === state.selected);
    btn.disabled = i >= count;
  });
  const zoom = $("zoomRange");
  if (zoom) zoom.value = String(state.slots[state.selected].zoom);
}

function refreshButtons() {
  const mark = (rowId, activeId) => {
    const row = $(rowId);
    if (!row) return;
    Array.from(row.children).forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.id === activeId);
    });
  };
  mark("layoutRow", state.layout);
  mark("gradeRow", state.grade);
  mark("titleStyleRow", state.titleStyle);
  mark("sizeRow", state.size);
  const ink = $("inkToggle");
  if (ink) {
    ink.classList.toggle("active", state.ink);
    ink.setAttribute("aria-pressed", String(state.ink));
  }
}

function buildChips(rowId, items, onPick) {
  const row = $(rowId);
  row.innerHTML = "";
  for (const item of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = item.label;
    btn.dataset.id = item.id;
    btn.addEventListener("click", () => onPick(item.id));
    row.appendChild(btn);
  }
}

function buildSamples() {
  const row = $("sampleRow");
  row.innerHTML = "";
  SAMPLES.forEach((sample, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sample";
    btn.title = sample.label;
    const img = document.createElement("img");
    img.src = "samples/" + sample.file;
    img.alt = sample.label;
    const label = document.createElement("span");
    label.textContent = sample.label;
    btn.appendChild(img);
    btn.appendChild(label);
    btn.addEventListener("click", async () => {
      try {
        await loadSampleIntoSlot(i, state.selected);
        setStatus(sample.label + " loaded into panel " + (state.selected + 1) + ".");
      } catch (err) {
        setStatus("Could not load " + sample.label + ".");
      }
    });
    row.appendChild(btn);
  });
}

function buildPanels() {
  const row = $("panelRow");
  row.innerHTML = "";
  for (let i = 0; i < MAX_SLOTS; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = String(i + 1);
    btn.addEventListener("click", () => {
      state.selected = i;
      queueDraw();
    });
    row.appendChild(btn);
  }
}

async function exportCover(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d");
  const layout = currentLayout();
  drawViceCover(ctx, size.w, size.h, {
    layout,
    grade: currentGrade(),
    ink: state.ink,
    titleStyle: state.titleStyle,
    title: state.title,
    subtitle: state.subtitle,
    caption: state.caption,
    images: layout.panels.map((_, i) => state.slots[i] && state.slots[i].img),
    zooms: layout.panels.map((_, i) => state.slots[i].zoom),
    pans: layout.panels.map((_, i) => ({ x: state.slots[i].ox, y: state.slots[i].oy })),
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vice-cover-" + size.w + "x" + size.h + ".png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  setStatus("Exported vice-cover-" + size.w + "x" + size.h + ".png.");
}

function runSelfTest() {
  const result = selfTestCover();
  if (result.failures.length === 0) {
    setStatus("Self-test: " + result.passed + "/" + result.total + " layouts OK.");
  } else {
    setStatus(
      "Self-test: " + result.passed + "/" + result.total + " OK — failed: " +
        result.failures.map((f) => f.layout).join(", "),
    );
  }
  window.__selfTest = result;
  return result;
}

function wireControls() {
  $("titleInput").addEventListener("input", (e) => {
    state.title = e.target.value;
    queueDraw();
  });
  $("subtitleInput").addEventListener("input", (e) => {
    state.subtitle = e.target.value;
    queueDraw();
  });
  $("captionInput").addEventListener("input", (e) => {
    state.caption = e.target.value;
    queueDraw();
  });
  $("zoomRange").addEventListener("input", (e) => {
    state.slots[state.selected].zoom = parseFloat(e.target.value);
    queueDraw();
  });
  $("inkToggle").addEventListener("click", () => {
    state.ink = !state.ink;
    queueDraw();
  });
  buildChips("layoutRow", VICE_LAYOUTS, (id) => {
    state.layout = id;
    if (state.selected >= currentLayout().panels.length) state.selected = 0;
    queueDraw();
  });
  buildChips("gradeRow", VICE_GRADES, (id) => {
    state.grade = id;
    queueDraw();
  });
  buildChips("titleStyleRow", VICE_TITLE_STYLES, (id) => {
    state.titleStyle = id;
    queueDraw();
  });
  buildChips("sizeRow", EXPORT_SIZES, (id) => {
    state.size = id;
    queueDraw();
  });
  buildChips("exportRow", EXPORT_SIZES, (id) => {
    const size = EXPORT_SIZES.find((s) => s.id === id);
    exportCover(size);
  });
  $("fillAllBtn").addEventListener("click", () => {
    const img = state.slots[state.selected].img;
    if (!img) {
      setStatus("Load a photo first, then fill every panel with it.");
      return;
    }
    state.slots.forEach((slot) => {
      slot.img = img;
      slot.zoom = state.slots[state.selected].zoom;
      slot.ox = 0;
      slot.oy = 0;
    });
    queueDraw();
    setStatus("Every panel now shows the same photo.");
  });
  $("surpriseBtn").addEventListener("click", async () => {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    state.layout = pick(VICE_LAYOUTS).id;
    state.grade = pick(VICE_GRADES).id;
    state.titleStyle = pick(VICE_TITLE_STYLES).id;
    state.title = pick(["SUNSET HEIST", "NEON DRIVE", "PALM COURT", "BOULEVARD QUEEN", "GOLD HOUR", "VICE CITY NIGHTS"]);
    const sample = Math.floor(Math.random() * SAMPLES.length);
    for (let i = 0; i < MAX_SLOTS; i++) await loadSampleIntoSlot(sample, i);
    $("titleInput").value = state.title;
    queueDraw();
    setStatus("Surprise! Layout " + state.layout + ", grade " + state.grade + ".");
  });
  $("selfTestBtn").addEventListener("click", runSelfTest);
  // Drag on the cover pans the selected panel's photo.
  let dragging = null;
  stage.addEventListener("pointerdown", (e) => {
    dragging = { x: e.clientX, y: e.clientY };
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const slot = state.slots[state.selected];
    slot.ox = Math.max(-0.5, Math.min(0.5, slot.ox + (e.clientX - dragging.x) / previewW));
    slot.oy = Math.max(-0.5, Math.min(0.5, slot.oy + (e.clientY - dragging.y) / previewH));
    dragging = { x: e.clientX, y: e.clientY };
    queueDraw();
  });
  const stopDrag = () => {
    dragging = null;
  };
  stage.addEventListener("pointerup", stopDrag);
  stage.addEventListener("pointercancel", stopDrag);
  // Uploads: file picker and drag-and-drop onto the drop zone.
  $("fileInput").addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (file) loadUpload(file);
  });
  const zone = $("dropzone");
  zone.addEventListener("dragover", (e) => e.preventDefault());
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) loadUpload(file);
  });
}

function loadUpload(file) {
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const img = await loadImage(reader.result);
      const slot = state.slots[state.selected];
      slot.img = img;
      slot.zoom = 1.15;
      slot.ox = 0;
      slot.oy = 0;
      queueDraw();
      setStatus("Your photo is in panel " + (state.selected + 1) + ".");
    } catch {
      setStatus("That file could not be read as a photo.");
    }
  };
  reader.readAsDataURL(file);
}

// Full-viewport cover used by ?shot=cover: the canvas becomes the page,
// so the screenshot is the exported cover at the gate's size.
async function drawShotCover(params) {
  document.body.classList.add("shot-cover");
  state.layout = params.get("layout") || "triptych";
  state.grade = params.get("grade") || "sunset";
  state.title = params.get("title") || "SUNSET HEIST";
  state.subtitle = params.get("subtitle") || "Vice City Nights";
  const sizeId = params.get("size") || "1920x1080";
  const size = EXPORT_SIZES.find((s) => s.id === sizeId) || EXPORT_SIZES[0];
  for (let i = 0; i < MAX_SLOTS; i++) {
    await loadSampleIntoSlot((i * 2 + 1) % SAMPLES.length, i);
  }
  stage.width = window.innerWidth;
  stage.height = window.innerHeight;
  const layout = currentLayout();
  drawViceCover(stageCtx, stage.width, stage.height, {
    layout,
    grade: currentGrade(),
    ink: false,
    titleStyle: "gradient",
    title: state.title,
    subtitle: state.subtitle,
    caption: "",
    images: layout.panels.map((_, i) => state.slots[i].img),
    zooms: layout.panels.map(() => 1.15),
    pans: layout.panels.map(() => ({ x: 0, y: 0 })),
  });
  document.title = "Vice Cover — " + state.title + " " + size.w + "x" + size.h;
  window.__viceReady = true;
}

async function boot() {
  const params = new URLSearchParams(window.location.search);
  wireControls();
  buildSamples();
  buildPanels();
  refreshButtons();
  window.__vice = { state, drawViceCover, selfTestCover, runSelfTest };
  if (params.get("shot") === "cover") {
    await drawShotCover(params);
    return;
  }
  if (params.get("layout")) state.layout = params.get("layout");
  if (params.get("grade")) state.grade = params.get("grade");
  if (params.get("title")) {
    state.title = params.get("title");
    $("titleInput").value = state.title;
  }
  if (params.get("size")) state.size = params.get("size");
  // Default spread: a different sample in every slot.
  const spread = [0, 1, 2, 3, 4];
  for (let i = 0; i < MAX_SLOTS; i++) {
    await loadSampleIntoSlot(spread[i % spread.length], i);
  }
  renderPreview();
  setStatus("Ready.");
  if (params.get("selftest") === "1") runSelfTest();
  window.__viceReady = true;
}

boot().catch((err) => {
  setStatus("Boot failed: " + (err && err.message ? err.message : err));
  console.error(err);
});
