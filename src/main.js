import { Game } from "./game.js";
import { Input } from "./input.js";
import { loadLevel } from "./level.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const loadingEl = document.getElementById("loading");

const input = new Input(window);
const [level, background, menuImage, sprites, enemySprites, tileSprites] =
  await Promise.all([
    loadLevel("../levels/level1.json"),
    loadImage("../assets/background.png"),
    loadImage("../assets/Loading Screen.png"),
    loadPlayerSprites(),
    loadEnemySprites(),
    loadTileSprites(),
  ]);
const spriteScale = sprites?.idle ? 28 / sprites.idle.height : 1;
const enemyScales = buildEnemyScales(enemySprites);

const game = new Game(canvas, ctx, input, level, {
  background,
  menuImage,
  sprites,
  spriteScale,
  enemySprites,
  enemyScales,
  tileSprites,
});
loadingEl.style.display = "none";

game.start();
window.addEventListener("resize", () => game.resize());

const music = createMusic("../audio/2012 Drill x Lofi Hype.mp3");
const audioState = {
  volume: 0.35,
  muted: false,
  lastVolume: 0.35,
  step: 0.1,
};
applyAudioVolume(music, audioState);
game.audioState = audioState;
setupMusic(music);
setupAudioControls(music, audioState);

function loadImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}

async function loadPlayerSprites() {
  const [idle, runLeft, runRight, jumpRight, gun, jumpFallback] =
    await Promise.all([
      loadSprite("../assets/MC Standing .png"),
      loadSprite("../assets/MC running left.png"),
      loadSprite("../assets/MC running right .jpeg"),
      loadSprite("../assets/MC Jumping right way .png"),
      loadSprite("../assets/MC with Gun.png"),
      loadSprite("../assets/Gemini_Generated_Image_ymfjl3ymfjl3ymfj.png"),
    ]);

  const jump = jumpRight || jumpFallback;

  if (!idle && !runLeft && !runRight && !jump && !gun) {
    return null;
  }

  return { idle, runLeft, runRight, jump, gun };
}

async function loadEnemySprites() {
  const [ninja, cop, snake] = await Promise.all([
    loadSprite("../assets/Ninja Attacker.png"),
    loadSprite("../assets/Police Character .png"),
    loadSprite("../assets/Snake in Grass.png"),
  ]);

  if (!ninja && !cop && !snake) {
    return null;
  }

  return { ninja, cop, snake };
}

async function loadTileSprites() {
  const [grass] = await Promise.all([loadSprite("../assets/Grass .png")]);

  if (!grass) return null;
  return { grass };
}

function buildEnemyScales(sprites) {
  if (!sprites) return null;
  const scales = {};
  if (sprites.ninja) scales.ninja = 26 / sprites.ninja.height;
  if (sprites.cop) scales.cop = 28 / sprites.cop.height;
  if (sprites.snake) scales.snake = 14 / sprites.snake.height;
  return scales;
}

async function loadSprite(path) {
  const img = await loadImage(path);
  if (!img) return null;
  return processSprite(img);
}

function createMusic(path) {
  const audio = new Audio(encodeURI(path));
  audio.loop = true;
  audio.preload = "auto";
  audio.load();
  return audio;
}

function applyAudioVolume(audio, state) {
  if (!audio) return;
  audio.volume = state.muted ? 0 : state.volume;
}

function setupMusic(audio) {
  if (!audio) return;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    audio.play().catch(() => {
      started = false;
    });
  };
  window.addEventListener("keydown", start, { once: true });
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("touchstart", start, { once: true });
}

function setupAudioControls(audio, state) {
  if (!audio) return;
  const clampVolume = (value) => Math.max(0, Math.min(1, value));
  const apply = () => applyAudioVolume(audio, state);

  const setVolume = (value) => {
    state.volume = clampVolume(value);
    if (state.muted && state.volume > 0) {
      state.muted = false;
    }
    if (!state.muted && state.volume === 0) {
      state.muted = true;
    }
    if (state.volume > 0) {
      state.lastVolume = state.volume;
    }
    apply();
  };

  const toggleMute = () => {
    if (!state.muted) {
      state.muted = true;
      state.lastVolume = state.volume || state.lastVolume;
    } else {
      state.muted = false;
      if (state.volume === 0) {
        state.volume = state.lastVolume || 0.35;
      }
    }
    apply();
  };

  const adjustVolume = (delta) => {
    setVolume(state.volume + delta);
  };

  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "Minus" || event.code === "NumpadSubtract") {
      adjustVolume(-state.step);
      event.preventDefault();
      return;
    }
    if (event.code === "Equal" || event.code === "NumpadAdd") {
      adjustVolume(state.step);
      event.preventDefault();
      return;
    }
    if (event.code === "KeyM") {
      toggleMute();
      event.preventDefault();
    }
  });
}

function processSprite(img) {
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Uint8Array(width * height);
  const stack = [0];

  while (stack.length) {
    const idx = stack.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    const offset = idx * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    const isGray = max - min < 18;
    const isBackground = isGray && brightness > 130;
    if (!isBackground) {
      continue;
    }

    data[offset + 3] = 0;
    const x = idx % width;
    const y = Math.floor(idx / width);
    if (x > 0) stack.push(idx - 1);
    if (x < width - 1) stack.push(idx + 1);
    if (y > 0) stack.push(idx - width);
    if (y < height - 1) stack.push(idx + width);
  }

  ctx.putImageData(imageData, 0, 0);

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let i = 0; i < width * height; i += 1) {
    const alpha = data[i * 4 + 3];
    if (alpha > 0) {
      const x = i % width;
      const y = Math.floor(i / width);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return canvas;
  }

  const pad = 2;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;
  const cropped = document.createElement("canvas");
  cropped.width = cropW;
  cropped.height = cropH;
  const cctx = cropped.getContext("2d");
  cctx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
  return cropped;
}
