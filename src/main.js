import { Game } from "./game.js";
import { Input } from "./input.js";
import { loadLevel } from "./level.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const loadingEl = document.getElementById("loading");

const input = new Input(window);
const [
  level1,
  level2,
  background1,
  background2,
  menuImage,
  sprites,
  enemySprites,
  tileSprites,
] = await Promise.all([
  loadLevel("../levels/level1.json"),
  loadLevel("../levels/level2.json"),
  loadImage("../assets/background.png"),
  loadImage("../assets/Level 2 background .png"),
  loadImage("../assets/Loading Screen.png"),
  loadPlayerSprites(),
  loadEnemySprites(),
  loadTileSprites(),
]);
const levels = [
  { level: level1, background: background1 },
  { level: level2, background: background2 || background1 },
];
const spriteScale = sprites?.idle ? 28 / sprites.idle.height : 1;
const enemyScales = buildEnemyScales(enemySprites);

const music = createMusic("../audio/2012 Drill x Lofi Hype.mp3", 0.3);
const sfx = {
  gun: createSfx("../audio/GUNPis-Generate_a_20-second-Elevenlabs.mp3", {
    volume: 1,
    poolSize: 6,
  }),
  coin: createSfx("../audio/UIAlert-Score_increase_sound-Elevenlabs.mp3", {
    volume: 0.9,
    poolSize: 8,
  }),
  siren: createSfx("../audio/VEHMisc-police_sirens-Elevenlabs.mp3", {
    volume: 0.8,
    poolSize: 2,
  }),
  bust: createSfx("../audio/Police_saying_Stop_R_#3-1767160089774.mp3", {
    volume: 0.9,
    poolSize: 2,
  }),
  death: createSfx("../audio/Man_grunting_when_ge_#1-1767163819478.mp3", {
    volume: 0.9,
    poolSize: 2,
  }),
  snake: createSfx("../audio/Snake_attacking_#3-1767164227281.mp3", {
    volume: 0.8,
    poolSize: 4,
  }),
  ninja: createSfx("../audio/Ninja_attacking_#3-1767164007149.mp3", {
    volume: 0.8,
    poolSize: 4,
  }),
  fall: createSfx("../audio/Man_yelling_loud_whi_#4-1767165390067.mp3", {
    volume: 0.9,
    poolSize: 2,
  }),
};
const audioState = {
  volume: 0.6,
  muted: false,
  lastVolume: 0.6,
  step: 0.1,
};
applyAudioState(music, sfx, audioState);

const game = new Game(canvas, ctx, input, levels[0].level, {
  levels,
  background: levels[0].background,
  menuImage,
  sprites,
  spriteScale,
  enemySprites,
  enemyScales,
  tileSprites,
  sfx,
});
game.music = music;
loadingEl.style.display = "none";

game.start();
window.addEventListener("resize", () => game.resize());
game.audioState = audioState;
setupAudioStart(music, sfx);
setupAudioControls(music, sfx, audioState);

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
  const [
    ninja,
    cop,
    snake,
    redNinja,
    blueNinja,
    swat,
    swatShootLeft,
    swatShootRight,
    bulldog,
  ] = await Promise.all([
    loadSprite("../assets/Ninja Attacker.png"),
    loadSprite("../assets/Police Character .png"),
    loadSprite("../assets/Snake in Grass.png"),
    loadSprite("../assets/Red Ninja - L2 .png"),
    loadSprite("../assets/Blue Ninja - L2.png"),
    loadSprite("../assets/Swat Cops - L2.png"),
    loadSprite("../assets/Swat with Gub left.png"),
    loadSprite("../assets/Swat with Gun right.png"),
    loadSprite("../assets/Bulldog - L2.png"),
  ]);

  if (
    !ninja &&
    !cop &&
    !snake &&
    !redNinja &&
    !blueNinja &&
    !swat &&
    !swatShootLeft &&
    !swatShootRight &&
    !bulldog
  ) {
    return null;
  }

  return {
    ninja,
    cop,
    snake,
    redNinja,
    blueNinja,
    swat,
    swatShootLeft,
    swatShootRight,
    bulldog,
  };
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
  if (sprites.redNinja) scales.redNinja = 26 / sprites.redNinja.height;
  if (sprites.blueNinja) scales.blueNinja = 26 / sprites.blueNinja.height;
  if (sprites.cop) scales.cop = 28 / sprites.cop.height;
  if (sprites.swat || sprites.swatShootRight || sprites.swatShootLeft) {
    const swatBase =
      sprites.swat || sprites.swatShootRight || sprites.swatShootLeft;
    scales.swat = 28 / swatBase.height;
  }
  if (sprites.snake) scales.snake = 14 / sprites.snake.height;
  if (sprites.bulldog) scales.bulldog = 16 / sprites.bulldog.height;
  return scales;
}

async function loadSprite(path) {
  const img = await loadImage(path);
  if (!img) return null;
  return processSprite(img);
}

function createMusic(path, baseVolume = 1) {
  const audio = new Audio(encodePath(path));
  audio.loop = true;
  audio.preload = "auto";
  audio.load();
  audio.baseVolume = baseVolume;
  return audio;
}

function createSfx(path, options = {}) {
  const poolSize = options.poolSize ?? 4;
  const baseVolume = options.volume ?? 1;
  const clips = Array.from({ length: poolSize }, () => {
    const clip = new Audio(encodePath(path));
    clip.preload = "auto";
    clip.load();
    return clip;
  });
  let index = 0;
  let primed = false;
  return {
    baseVolume,
    setVolume(masterVolume) {
      const volume = masterVolume * baseVolume;
      clips.forEach((clip) => {
        clip.volume = volume;
      });
    },
    prime() {
      if (primed) return;
      primed = true;
      clips.forEach((clip) => {
        const prevVolume = clip.volume;
        clip.volume = 0;
        clip.play()
          .then(() => {
            clip.pause();
            clip.currentTime = 0;
            clip.volume = prevVolume;
          })
          .catch(() => {
            clip.volume = prevVolume;
          });
      });
    },
    play() {
      const clip = clips[index];
      index = (index + 1) % clips.length;
      clip.currentTime = 0;
      clip.play().catch(() => {});
    },
  };
}

function encodePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function applyAudioState(music, sfx, state) {
  const volume = state.muted ? 0 : state.volume;
  if (music) {
    music.volume = volume * (music.baseVolume ?? 1);
  }
  if (sfx) {
    Object.values(sfx).forEach((sound) => sound.setVolume(volume));
  }
}

function setupAudioStart(audio, sfx) {
  if (!audio && !sfx) return;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    if (audio) {
      audio.play().catch(() => {
        started = false;
      });
    }
    if (sfx) {
      Object.values(sfx).forEach((sound) => sound.prime && sound.prime());
    }
  };
  window.addEventListener("keydown", start, { once: true });
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("touchstart", start, { once: true });
}

function setupAudioControls(music, sfx, state) {
  if (!music && !sfx) return;
  const clampVolume = (value) => Math.max(0, Math.min(1, value));
  const apply = () => applyAudioState(music, sfx, state);

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
