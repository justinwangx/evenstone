import { createGl, loadImage, type PhotoTexture } from "./gl";
import { Scene } from "./scene";
import { Halo } from "./halo";
import { formatTime, photos, sequence, type Order } from "./photos";
import { charFlicker } from "./words";
import "./styles.css";

const HOLD_MS = 5000;
const TRANSITION_MS = 5000;
const BLOCK_SIZE_CSS = 3;
const HALO_MAX_DIM = 96; // halo internal resolution; sigma≈5 blur → soft glow

const stageCanvas = document.getElementById("stage") as HTMLCanvasElement;
const haloCanvas = document.getElementById("halo") as HTMLCanvasElement;
const timestampEl = document.getElementById("timestamp") as HTMLElement;
const aboutBtn = document.getElementById("about") as HTMLButtonElement;
const aboutModal = document.getElementById("about-modal") as HTMLElement;

const stageScene = new Scene(createGl(stageCanvas));
const halo = new Halo(createGl(haloCanvas), HALO_MAX_DIM, HALO_MAX_DIM);

charFlicker("about", 6000);

let aboutOpen = false;

function openAbout(): void {
  if (aboutOpen) return;
  aboutOpen = true;
  aboutModal.classList.add("open");
  aboutModal.setAttribute("aria-hidden", "false");
}

function closeAbout(): void {
  if (!aboutOpen) return;
  aboutOpen = false;
  aboutModal.classList.remove("open");
  aboutModal.setAttribute("aria-hidden", "true");
}

// preventDefault on mousedown stops the about button from getting focused
// on click. Focus is the trigger for Chrome's cursor reset glitch — without
// focus moving to the button, the cursor URL stays applied throughout.
aboutBtn.addEventListener("mousedown", (e) => e.preventDefault());

aboutBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (aboutOpen) closeAbout();
  else openAbout();
});

// Click anywhere on the modal backdrop or its content closes it.
aboutModal.addEventListener("click", () => closeAbout());

// Custom cursor: a small DOM ring that follows the mouse. The system
// cursor is hidden via CSS — if Chrome leaks the system cursor on certain
// transitions, the cursor URL fallback (a transparent PNG) holds the line.
function setupCursor(): void {
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const el = document.createElement("div");
  el.className = "cursor";
  document.body.appendChild(el);
  document.addEventListener("mousemove", (e) => {
    el.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });
}
setupCursor();

function resizeStage(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = stageCanvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (stageCanvas.width !== w || stageCanvas.height !== h) {
    stageCanvas.width = w;
    stageCanvas.height = h;
  }
}
function resizeHalo(): void {
  const aspect = window.innerWidth / window.innerHeight;
  const w = aspect >= 1 ? HALO_MAX_DIM : Math.round(HALO_MAX_DIM * aspect);
  const h = aspect >= 1 ? Math.round(HALO_MAX_DIM / aspect) : HALO_MAX_DIM;
  if (haloCanvas.width !== w || haloCanvas.height !== h) {
    haloCanvas.width = w;
    haloCanvas.height = h;
    halo.resize(w, h);
  }
}
new ResizeObserver(resizeStage).observe(stageCanvas);
window.addEventListener("resize", resizeHalo);
resizeStage();
resizeHalo();

// Sky color sampled from each photo's top quarter. Drives the top-glow
// gradient so the upper page picks up real light from the current shot,
// and updates the mobile chrome address bar via theme-color.
type Rgb = [number, number, number];
const topColors = new Map<number, Rgb>();

function extractTopColor(image: HTMLImageElement): Rgb {
  const c = document.createElement("canvas");
  c.width = 16;
  c.height = 8;
  const ctx = c.getContext("2d");
  if (!ctx) return [220, 220, 220];
  ctx.drawImage(
    image,
    0,
    0,
    image.naturalWidth,
    Math.round(image.naturalHeight * 0.25),
    0,
    0,
    16,
    8
  );
  const { data } = ctx.getImageData(0, 0, 16, 8);
  let r = 0;
  let g = 0;
  let b = 0;
  const n = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

// Image cache (one network fetch per photo, shared between contexts)
const imageCache = new Map<number, Promise<HTMLImageElement>>();
function getImage(index: number): Promise<HTMLImageElement> {
  let entry = imageCache.get(index);
  if (!entry) {
    entry = loadImage(photos[index].src).then((img) => {
      topColors.set(index, extractTopColor(img));
      return img;
    });
    imageCache.set(index, entry);
  }
  return entry;
}

function setTopTint(index: number): void {
  const rgb = topColors.get(index);
  if (!rgb) return;
  const [r, g, b] = rgb;
  document.documentElement.style.setProperty(
    "--top-tint",
    `rgba(${r}, ${g}, ${b}, 0.42)`
  );
}

const themeMeta = document.querySelector<HTMLMetaElement>(
  'meta[name="theme-color"]'
);
function setThemeColor(index: number): void {
  if (!themeMeta) return;
  const rgb = topColors.get(index);
  if (!rgb) return;
  // Pull toward dark a bit so the address bar doesn't feel garish next to
  // the photo on mobile.
  const [r, g, b] = rgb;
  const dim = (v: number) => Math.round(v * 0.55);
  themeMeta.content = `rgb(${dim(r)}, ${dim(g)}, ${dim(b)})`;
}

// Texture caches — one per WebGL context, since textures aren't shareable
interface TextureLoader {
  loadPhoto(image: HTMLImageElement): PhotoTexture;
}
function makeTextureCache(loader: TextureLoader) {
  const cache = new Map<number, Promise<PhotoTexture>>();
  return (index: number): Promise<PhotoTexture> => {
    let entry = cache.get(index);
    if (!entry) {
      entry = getImage(index).then((img) => loader.loadPhoto(img));
      cache.set(index, entry);
    }
    return entry;
  };
}
const getStageTexture = makeTextureCache(stageScene);
const getHaloTexture = makeTextureCache(halo);

interface Pair {
  stage: PhotoTexture;
  halo: PhotoTexture;
}
async function getPair(index: number): Promise<Pair> {
  const [stage, halo] = await Promise.all([
    getStageTexture(index),
    getHaloTexture(index),
  ]);
  return { stage, halo };
}

type State =
  | { kind: "hold"; pair: Pair }
  | { kind: "transition"; from: Pair; to: Pair; start: number };

let state: State | null = null;

function showTimestamp(index: number): void {
  timestampEl.textContent = formatTime(photos[index].takenAt);
  timestampEl.classList.add("visible");
}
function hideTimestamp(): void {
  timestampEl.classList.remove("visible");
}

function blockSize(): number {
  return BLOCK_SIZE_CSS * Math.min(window.devicePixelRatio || 1, 2);
}

function render(): void {
  if (!state) return;
  const progress =
    state.kind === "transition"
      ? Math.min(1, (performance.now() - state.start) / TRANSITION_MS)
      : 0;
  const stageA = state.kind === "hold" ? state.pair.stage : state.from.stage;
  const stageB = state.kind === "hold" ? state.pair.stage : state.to.stage;
  const haloA = state.kind === "hold" ? state.pair.halo : state.from.halo;
  const haloB = state.kind === "hold" ? state.pair.halo : state.to.halo;

  stageScene.draw({
    photoA: stageA,
    photoB: stageB,
    progress,
    blockSize: blockSize(),
    canvasWidth: stageCanvas.width,
    canvasHeight: stageCanvas.height,
  });
  halo.draw({
    photoA: haloA,
    photoB: haloB,
    progress,
    canvasWidth: haloCanvas.width,
    canvasHeight: haloCanvas.height,
  });
  requestAnimationFrame(render);
}


let order: Order = "curated";

// Photo loop state. Advancing is now event-driven (timer fires or keyboard
// triggers it) so it can be paused or scrubbed manually.
let seq = sequence(order);
let cursor = 0;
let current: Pair | null = null;
let advanceTimer: number | null = null;
let isTransitioning = false;
let paused = false;

function clearAdvanceTimer(): void {
  if (advanceTimer !== null) {
    clearTimeout(advanceTimer);
    advanceTimer = null;
  }
}

function scheduleAdvance(): void {
  clearAdvanceTimer();
  if (paused) return;
  advanceTimer = window.setTimeout(() => advance(1), HOLD_MS);
}

async function advance(direction: 1 | -1): Promise<void> {
  if (isTransitioning || !current) return;
  isTransitioning = true;
  clearAdvanceTimer();

  const nextSeqIdx = (cursor + direction + seq.length) % seq.length;
  const next = await getPair(seq[nextSeqIdx]);
  void getPair(seq[(cursor + direction * 2 + seq.length * 2) % seq.length]);

  hideTimestamp();
  state = {
    kind: "transition",
    from: current,
    to: next,
    start: performance.now(),
  };
  setTopTint(seq[nextSeqIdx]);
  setThemeColor(seq[nextSeqIdx]);
  await sleep(TRANSITION_MS);

  current = next;
  cursor = nextSeqIdx;
  state = { kind: "hold", pair: current };
  showTimestamp(seq[cursor]);
  isTransitioning = false;
  scheduleAdvance();
}

async function dismissTitleCard(): Promise<void> {
  const card = document.getElementById("title-card");
  if (!card) return;
  card.classList.add("hidden");
  await sleep(1600); // matches CSS transition
  card.remove();
}

// Keyboard:
//   ←/→ advance/reverse, space pauses/resumes.
//   While the about modal is open, any of esc/space/enter dismisses it
//   and other navigation keys are ignored.
document.addEventListener("keydown", (e) => {
  if (aboutOpen) {
    if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      closeAbout();
    }
    return;
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    advance(1);
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    advance(-1);
  } else if (e.key === " " || e.code === "Space") {
    e.preventDefault();
    paused = !paused;
    if (paused) clearAdvanceTimer();
    else scheduleAdvance();
  }
});

async function run(): Promise<void> {
  // Title card is already painted on first frame (HTML+CSS, no fade-in).
  // Load the first photo and start rendering the scene behind it; only
  // when the scene is on-screen do we fade the card out.
  current = await getPair(seq[cursor]);
  state = { kind: "hold", pair: current };
  setTopTint(seq[cursor]);
  setThemeColor(seq[cursor]);
  requestAnimationFrame(render);

  // Hold the title for a beat so it reads, then dismiss.
  await sleep(2200);
  await dismissTitleCard();

  showTimestamp(seq[cursor]);
  scheduleAdvance();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

declare global {
  interface Window {
    setOrder: (o: Order) => void;
  }
}
window.setOrder = (o: Order) => {
  if (o === order) return;
  order = o;
  location.reload();
};

run().catch((err) => console.error(err));
