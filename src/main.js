import { Game } from "./game.js?v=26";
import {
  ENTITY_STATES,
  createClip,
  createFrame,
  mergeFrames,
  splitSpriteSheet,
} from "./animation.js?v=5";
import { Input } from "./input.js?v=5";
import { loadLevel } from "./level.js?v=9";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const loadingEl = document.getElementById("loading");
const loadBarEl = document.getElementById("load-bar");
const loadTextEl = document.getElementById("load-text");

if (window.__blockhot_muted === undefined) {
  window.__blockhot_muted = false;
}

const audioManager = {
  ctx: null,
  unlocked: false,
  masterVolume: 0.6,
  pendingUnlock: [],

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = AC ? new AC() : null;
    } catch (error) {
      this.ctx = null;
    }
  },

  unlock() {
    if (this.unlocked) {
      return Promise.resolve();
    }
    if (!this.ctx) {
      this.init();
    }

    const manager = this;
    const finalize = function() {
      manager.unlocked = true;
      const pending = manager.pendingUnlock.slice();
      manager.pendingUnlock.length = 0;
      pending.forEach(function(fn) {
        try {
          fn();
        } catch (error) {
          console.warn("Deferred audio play failed.", error);
        }
      });
    };

    if (!this.ctx) {
      finalize();
      return Promise.resolve();
    }

    if (this.ctx.state === "suspended") {
      return this.ctx.resume()
        .then(function() {
          finalize();
        })
        .catch(function() {
          finalize();
        });
    }

    finalize();
    return Promise.resolve();
  },

  ensurePlaying(audioEl) {
    if (!audioEl) return Promise.resolve();
    const playFn = audioEl._nativePlay || audioEl.play.bind(audioEl);
    if (this.unlocked) {
      return playFn().catch(function() {});
    }
    this.pendingUnlock.push(function() {
      playFn().catch(function() {});
    });
    return Promise.resolve();
  },
};

audioManager.init();

function unlockAudio() {
  audioManager.unlock();
}

window.addEventListener("touchstart", unlockAudio, {
  once: false,
  passive: true,
});
window.addEventListener("touchend", unlockAudio, {
  once: false,
  passive: true,
});
window.addEventListener("click", unlockAudio, {
  once: false,
  passive: true,
});
window.addEventListener("keydown", unlockAudio, {
  once: false,
  passive: true,
});

const LEVEL_ASSET_SPECS = [
  { key: "level1", path: "../levels/level1.json", label: "Level 1" },
  { key: "level2", path: "../levels/level2.json", label: "Level 2" },
  { key: "level3", path: "../levels/level3.json", label: "Level 3" },
  { key: "level4", path: "../levels/level4.json", label: "Level 4" },
];

const BACKGROUND_ASSET_SPECS = [
  { key: "background1", path: "../assets/background.png", label: "Background 1", kind: "image" },
  { key: "background2", path: "../assets/Level 2 background .png", label: "Background 2", kind: "image" },
  { key: "background3Primary", path: "../assets/Level 3 Background .png", label: "Background 3", kind: "image" },
  { key: "background3Alt", path: "../assets/Level 3 background .png", label: "Background 3 Alt", kind: "image" },
  { key: "background3Fallback", path: "../assets/O-Block Background.png", label: "Background 3 Fallback", kind: "image" },
  { key: "background4", path: "../assets/level 4 background.png", label: "Background 4", kind: "image" },
  { key: "arrestImage", path: "../assets/cutscene_arrest.png", label: "Arrest Cutscene", kind: "image" },
  { key: "menuImage", path: "../assets/Loading Screen.png", label: "Menu Screen", kind: "image" },
];

const PLAYER_ASSET_SPECS = [
  { key: "idleRight", path: "../assets/MC idle standing right.jpg", label: "MC Idle Right", kind: "sprite" },
  { key: "idleLeft", path: "../assets/MC idle standing left.jpg", label: "MC Idle Left", kind: "sprite" },
  { key: "runRight", path: "../assets/MC running right (1) jpg.jpg", label: "MC Run Right", kind: "sprite" },
  { key: "runLeftA", path: "../assets/MC running left (1).jpg", label: "MC Run Left 1", kind: "sprite" },
  { key: "runLeftB", path: "../assets/MC running left-2 .jpg", label: "MC Run Left 2", kind: "sprite" },
  { key: "jumpLeftSingle", path: "../assets/MC jumping .jpg", label: "MC Jump Left", kind: "sprite" },
  { key: "jumpRightSingle", path: "../assets/MC jumping right.png", label: "MC Jump Right", kind: "sprite" },
  { key: "jumpSheet", path: "../assets/Gemini_Generated_Image_ixbq8gixbq8gixbq.png", label: "MC Jump Sheet", kind: "image" },
  { key: "gunReady", path: "../assets/MC with Gun (1) .jpg", label: "MC Gun Ready", kind: "sprite" },
  { key: "shootRight", path: "../assets/MC Shooting right.jpg", label: "MC Shooting", kind: "sprite" },
];

const ENEMY_ASSET_SPECS = [
  { key: "ninjaMovement", path: "../assets/Ninja_attacker_movement.png", label: "Ninja Movement", kind: "image" },
  { key: "ninja", path: "../assets/Ninja Attacker.png", label: "Ninja Idle", kind: "sprite" },
  { key: "cop", path: "../assets/Police Character .png", label: "Police", kind: "sprite" },
  { key: "snake", path: "../assets/Snake in Grass.png", label: "Snake", kind: "sprite" },
  { key: "snakeIdleSheet", path: "../assets/Snake_in_grass_idle.png", label: "Snake Idle Sheet", kind: "image" },
  { key: "snakeAttackSheet", path: "../assets/Snake_in_grass_attack.png", label: "Snake Attack Sheet", kind: "image" },
  { key: "redNinja", path: "../assets/Red Ninja - L2 .png", label: "Red Ninja", kind: "sprite" },
  { key: "blueNinja", path: "../assets/Blue Ninja - L2.png", label: "Blue Ninja", kind: "sprite" },
  { key: "redNinjaAttack", path: "../assets/Red Ninja Attacking .png", label: "Red Ninja Attack", kind: "sprite" },
  { key: "blueNinjaAttack", path: "../assets/Blue ninja attacking .png", label: "Blue Ninja Attack", kind: "sprite" },
  { key: "swatLegacy", path: "../assets/Swat Cops - L2.png", label: "SWAT Legacy", kind: "sprite" },
  { key: "swatIdle", path: "../assets/Swat idle standing.png", label: "SWAT Idle", kind: "sprite" },
  { key: "swatWalkLeft", path: "../assets/Swat walking left.png", label: "SWAT Walk Left", kind: "sprite" },
  { key: "swatWalkRight", path: "../assets/Swat walking right.png", label: "SWAT Walk Right", kind: "sprite" },
  { key: "swatShootLeft", path: "../assets/Swat shooting left.png", label: "SWAT Shoot Left", kind: "sprite" },
  { key: "swatShootRight", path: "../assets/Swat shooting right.png", label: "SWAT Shoot Right", kind: "sprite" },
  { key: "swatLegacyShootLeft", path: "../assets/Swat with Gub left.png", label: "SWAT Gun Left", kind: "sprite" },
  { key: "swatLegacyShootRight", path: "../assets/Swat with Gun right.png", label: "SWAT Gun Right", kind: "sprite" },
  { key: "bulldogMovement", path: "../assets/bulldog_movement.png", label: "Bulldog Movement", kind: "image" },
  { key: "bulldogAttack", path: "../assets/bulldog_attack.png", label: "Bulldog Attack", kind: "image" },
  { key: "bulldog", path: "../assets/Bulldog - L2.png", label: "Bulldog", kind: "sprite" },
];

const BOSS_ASSET_SPECS = [
  { key: "idlePrimary", path: "../assets/Boss Twan .png", label: "Boss Idle", kind: "sprite" },
  { key: "idleRight", path: "../assets/Boss_Enforcer.png", label: "Boss Right", kind: "sprite" },
  { key: "idleLeft", path: "../assets/Boss Twan - facing left.jpg", label: "Boss Left", kind: "sprite" },
  { key: "walkCenter", path: "../assets/Boss Twan - walking.jpg", label: "Boss Walk Center", kind: "sprite" },
  { key: "walkRightA", path: "../assets/Boss Twan walking - right.jpg", label: "Boss Walk Right 1", kind: "sprite" },
  { key: "walkRightB", path: "../assets/Boss Twan walking -  right (2).jpg", label: "Boss Walk Right 2", kind: "sprite" },
  { key: "walkLeftA", path: "../assets/Boss Twan walking -left.jpg", label: "Boss Walk Left", kind: "sprite" },
  { key: "chargeLeftA", path: "../assets/Boss Twan - charging left (1).jpg", label: "Boss Charge Left 1", kind: "sprite" },
  { key: "chargeLeftB", path: "../assets/Boss Twan - charging left (2).jpg", label: "Boss Charge Left 2", kind: "sprite" },
  { key: "swipeLeft", path: "../assets/Boss Twan punching - left .jpg", label: "Boss Punch Left", kind: "sprite" },
  { key: "swipeRight", path: "../assets/Boss Twan punching - right.jpg", label: "Boss Punch Right", kind: "sprite" },
  { key: "shootLeft", path: "../assets/Boss Twan - shooting left.png", label: "Boss Shoot Left", kind: "sprite" },
  { key: "shootRight", path: "../assets/Boss Twan - shooting right.png", label: "Boss Shoot Right", kind: "sprite" },
  { key: "gunLeft", path: "../assets/Boss Twan - with gun.png", label: "Boss Gun Left", kind: "sprite" },
  { key: "gunRight", path: "../assets/boss Twan - with gun - right.png", label: "Boss Gun Right", kind: "sprite" },
];

const TILE_ASSET_SPECS = [
  { key: "grass", path: "../assets/Grass .png", label: "Grass Tile", kind: "sprite" },
];

const POWER_UP_ASSET_SPECS = [
  { key: "gun", path: "../assets/Gun power up.png", label: "Gun Powerup", kind: "sprite" },
  { key: "health", path: "../assets/health power up.png", label: "Health Powerup", kind: "sprite" },
];

const AUDIO_ASSET_SPECS = [
  { key: "music", path: "../audio/2012 Drill x Lofi Hype.mp3", label: "Stage Music", kind: "music", baseVolume: 0.3 },
  { key: "bossMusic", path: "../audio/Boss Level Drill (Take 2).mp3", label: "Boss Music", kind: "music", baseVolume: 0.38 },
  { key: "gun", path: "../audio/GUNPis-Generate_a_20-second-Elevenlabs.mp3", label: "Gun SFX", kind: "sfx", options: { volume: 1, poolSize: 10 } },
  { key: "coin", path: "../audio/UIAlert-Score_increase_sound-Elevenlabs.mp3", label: "Coin SFX", kind: "sfx", options: { volume: 0.9, poolSize: 8 } },
  { key: "siren", path: "../audio/VEHMisc-police_sirens-Elevenlabs.mp3", label: "Siren SFX", kind: "sfx", options: { volume: 0.8, poolSize: 2 } },
  { key: "bust", path: "../audio/Police_saying_Stop_R_#3-1767160089774.mp3", label: "Bust SFX", kind: "sfx", options: { volume: 0.9, poolSize: 2 } },
  { key: "death", path: "../audio/Man_grunting_when_ge_#1-1767163819478.mp3", label: "Death SFX", kind: "sfx", options: { volume: 0.9, poolSize: 2 } },
  { key: "snake", path: "../audio/Snake_attacking_#3-1767164227281.mp3", label: "Snake SFX", kind: "sfx", options: { volume: 0.8, poolSize: 4 } },
  { key: "ninja", path: "../audio/Ninja_attacking_#3-1767164007149.mp3", label: "Ninja SFX", kind: "sfx", options: { volume: 0.8, poolSize: 4 } },
  { key: "fall", path: "../audio/Man_yelling_loud_whi_#4-1767165390067.mp3", label: "Fall SFX", kind: "sfx", options: { volume: 0.9, poolSize: 2 } },
  { key: "bulldog", path: "../audio/Bulldog_growling_agg_#4-1767427632987.mp3", label: "Bulldog SFX", kind: "sfx", options: { volume: 0.8, poolSize: 4 } },
  { key: "bossLaugh", path: "../audio/Boss Laugh sound.mp3", label: "Boss Laugh", kind: "sfx", options: { volume: 0.9, poolSize: 2 } },
  { key: "bossDrop", path: "../audio/Boss Drop impact sound.mp3", label: "Boss Drop", kind: "sfx", options: { volume: 0.95, poolSize: 2 } },
  { key: "bossGun", path: "../audio/Boss Gun shooting sound.mp3", label: "Boss Gun", kind: "sfx", options: { volume: 0.95, poolSize: 5 } },
  { key: "bossHurt", path: "../audio/Boss Injured sound.mp3", label: "Boss Hurt", kind: "sfx", options: { volume: 0.9, poolSize: 4 } },
];

const TOTAL_ASSET_COUNT =
  LEVEL_ASSET_SPECS.length +
  BACKGROUND_ASSET_SPECS.length +
  PLAYER_ASSET_SPECS.length +
  ENEMY_ASSET_SPECS.length +
  BOSS_ASSET_SPECS.length +
  TILE_ASSET_SPECS.length +
  POWER_UP_ASSET_SPECS.length +
  AUDIO_ASSET_SPECS.length;

const input = new Input(window);
init().catch(function(error) {
  console.error("BlockHot failed to boot.", error);
  if (loadBarEl) {
    loadBarEl.style.width = "100%";
  }
  if (loadTextEl) {
    loadTextEl.textContent = `Failed to load game: ${error.message || error}`;
  } else {
    loadingEl.textContent = `Failed to load game: ${error.message || error}`;
  }
});

async function init() {
  const progress = createLoadingTracker(TOTAL_ASSET_COUNT);

  await progress.phase("Loading levels...");
  const levelAssets = await loadLevels(progress);

  await progress.phase("Loading backgrounds...");
  const backgroundAssets = await loadAssetMap(BACKGROUND_ASSET_SPECS, progress);

  await progress.phase("Loading characters...");
  const rawPlayerAssets = await loadAssetMap(PLAYER_ASSET_SPECS, progress);

  await progress.phase("Loading enemies...");
  const rawEnemyAssets = await loadAssetMap(ENEMY_ASSET_SPECS, progress);

  await progress.phase("Loading boss...");
  const rawBossAssets = await loadAssetMap(BOSS_ASSET_SPECS, progress);

  await progress.phase("Loading pickups...");
  const rawPowerUpAssets = await loadAssetMap(POWER_UP_ASSET_SPECS, progress);

  await progress.phase("Loading tiles...");
  const rawTileAssets = await loadAssetMap(TILE_ASSET_SPECS, progress);

  await progress.phase("Loading audio...");
  const audioAssets = await loadAudioAssets(progress);

  await progress.ready();

  const playerAnimations = await loadPlayerAnimations(rawPlayerAssets);
  const enemyAnimations = await loadEnemyAnimations(rawEnemyAssets);
  const bossAnimations = await loadBossAnimations(rawBossAssets);
  const powerUpSprites = await loadPowerUpSprites(rawPowerUpAssets);
  const tileSprites = await loadTileSprites(rawTileAssets);
  await setLoadingStatus("Starting game...");

  const level1 = levelAssets.level1;
  const level2 = levelAssets.level2;
  const level3 = levelAssets.level3;
  const level4 = levelAssets.level4;
  const background1 = backgroundAssets.background1;
  const background2 = backgroundAssets.background2;
  const background3Primary = backgroundAssets.background3Primary;
  const background3Alt = backgroundAssets.background3Alt;
  const background3Fallback = backgroundAssets.background3Fallback;
  const background4 = backgroundAssets.background4;
  const arrestImage = backgroundAssets.arrestImage;
  const menuImage = backgroundAssets.menuImage;
  const levels = [
    { level: level1, background: background1 },
    { level: level2, background: background2 || background1 },
    {
      level: level3,
      background:
        background3Primary ||
        background3Alt ||
        background3Fallback ||
        background2 ||
        background1,
    },
    {
      level: level4,
      background: background4 || background3Primary || background2 || background1,
    },
  ];
  const playerBaseHeight = getAnimationBaseHeight(playerAnimations);
  const bossBaseHeight = getAnimationBaseHeight(bossAnimations);
  const spriteScale = playerBaseHeight
    ? 28 / playerBaseHeight
    : 1;
  const enemyScales = buildEnemyScales(enemyAnimations);
  const bossScale = bossBaseHeight ? 42 / bossBaseHeight : 1;

  const music = audioAssets.music;
  const bossMusic = audioAssets.bossMusic;
  const sfx = audioAssets.sfx;
  const audioState = {
    volume: 0.6,
    muted: !!window.__blockhot_muted,
    lastVolume: 0.6,
    step: 0.1,
  };
  applyAudioState(music, sfx, audioState, [bossMusic]);

  const game = new Game(canvas, ctx, input, levels[0].level, {
    levels,
    background: levels[0].background,
    menuImage,
    arrestImage,
    playerAnimations,
    spriteScale,
    enemyAnimations,
    enemyScales,
    bossAnimations,
    bossScale,
    powerUpSprites,
    tileSprites,
    sfx,
    audioManager,
    startMusic,
  });
  game.music = music;
  game.bossMusic = bossMusic;
  game.audioState = audioState;

  if (loadingEl) {
    loadingEl.style.transition = "opacity 0.4s ease";
    loadingEl.style.opacity = "0";
    setTimeout(function() {
      loadingEl.style.display = "none";
    }, 400);
  }
  game.start();
  window.addEventListener("resize", () => game.resize());
  setupAudioStart(music, sfx);
  setupAudioControls(music, sfx, audioState, [bossMusic]);
}

function createLoadingTracker(totalAssets) {
  let loadedAssets = 0;
  if (loadBarEl) {
    loadBarEl.style.width = "0%";
  }

  return {
    async phase(message) {
      if (loadTextEl) {
        loadTextEl.textContent = message || "Loading...";
      }
      await waitForPaint();
    },
    async step(label) {
      loadedAssets += 1;
      const pct = totalAssets > 0
        ? Math.round((loadedAssets / totalAssets) * 100)
        : 100;
      if (loadBarEl) {
        loadBarEl.style.width = `${Math.min(100, pct)}%`;
      }
      if (loadTextEl) {
        loadTextEl.textContent = label || "Loading...";
      }
      await waitForPaint();
    },
    async ready() {
      if (loadBarEl) {
        loadBarEl.style.width = "100%";
      }
      if (loadTextEl) {
        loadTextEl.textContent = "Ready!";
      }
      await waitForPaint();
    },
  };
}

function waitForPaint() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.requestAnimationFrame) {
      setTimeout(resolve, 0);
      return;
    }
    window.requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

async function loadLevels(progress) {
  const levels = {};
  for (let i = 0; i < LEVEL_ASSET_SPECS.length; i += 1) {
    const spec = LEVEL_ASSET_SPECS[i];
    levels[spec.key] = await loadLevelTracked(spec.path, spec.label, progress);
  }
  return levels;
}

async function loadAssetMap(specs, progress) {
  const assets = {};
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    assets[spec.key] = await loadImageTracked(spec.path, spec.label, progress);
  }
  return assets;
}

async function loadLevelTracked(path, label, progress) {
  const level = await loadLevel(resolveUrl(path));
  if (progress) {
    await progress.step(label || path);
  }
  return level;
}

function loadImageTracked(path, label, progress) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = function() {
      const finish = progress
        ? progress.step(label || path)
        : Promise.resolve();
      finish.then(function() {
        resolve(img);
      });
    };
    img.onerror = function() {
      const finish = progress
        ? progress.step(label || path)
        : Promise.resolve();
      finish.then(function() {
        resolve(null);
      });
    };
    img.src = resolveUrl(path);
  });
}

async function setLoadingStatus(message) {
  if (loadTextEl) {
    loadTextEl.textContent = message || "Loading...";
  }
  await waitForPaint();
}

async function processSpriteSequentially(image, label) {
  if (!image) return null;
  await setLoadingStatus(label ? `Processing ${label}...` : "Processing sprites...");
  const processed = processSprite(image);
  await waitForPaint();
  return processed;
}

async function processSourceSequentially(image, label) {
  if (!image) return null;
  return processSpriteSequentially(image, label);
}

async function processSpritesSequentially(images, specs) {
  const results = {};
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    const image = images ? images[spec.key] : null;
    if (spec.kind === "sprite") {
      results[spec.key] = await processSpriteSequentially(image, spec.label);
    } else {
      results[spec.key] = image || null;
    }
  }
  return results;
}

async function extractFrameSpritesSequential(image, frameCount, labelPrefix) {
  if (!image) return [];
  const frames = splitSpriteSheet(image, frameCount);
  const results = [];
  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    const cropped = cropImage(frame.image, {
      x: frame.sx,
      y: frame.sy,
      w: frame.sw,
      h: frame.sh,
    });
    const label = labelPrefix
      ? `${labelPrefix} ${i + 1}`
      : `Sprite ${i + 1}`;
    const processed = await processSourceSequentially(cropped, label);
    if (processed) {
      results.push(processed);
    }
  }
  return results;
}

async function extractRowFrameSpritesSequential(
  image,
  rowCount,
  rowIndex,
  frameCount,
  labelPrefix
) {
  const rows = splitImageRows(image, rowCount);
  const rowImage = rows[rowIndex];
  return extractFrameSpritesSequential(rowImage, frameCount, labelPrefix);
}

async function loadAudioAssets(progress) {
  const assets = {};
  for (let i = 0; i < AUDIO_ASSET_SPECS.length; i += 1) {
    const spec = AUDIO_ASSET_SPECS[i];
    if (spec.kind === "music") {
      assets[spec.key] = createMusic(spec.path, spec.baseVolume);
    } else {
      assets[spec.key] = createSfx(spec.path, spec.options);
    }
    if (progress) {
      await progress.step(spec.label);
    }
  }

  return {
    music: assets.music || null,
    bossMusic: assets.bossMusic || null,
    sfx: {
      gun: assets.gun,
      coin: assets.coin,
      siren: assets.siren,
      bust: assets.bust,
      death: assets.death,
      snake: assets.snake,
      ninja: assets.ninja,
      fall: assets.fall,
      bulldog: assets.bulldog,
      bossLaugh: assets.bossLaugh,
      bossDrop: assets.bossDrop,
      bossGun: assets.bossGun,
      bossHurt: assets.bossHurt,
    },
  };
}

async function loadPlayerAnimations(rawAssets) {
  const assets = await processSpritesSequentially(rawAssets, PLAYER_ASSET_SPECS);
  const idleRight = assets.idleRight;
  const idleLeft = assets.idleLeft;
  const runRight = assets.runRight;
  const runLeftA = assets.runLeftA;
  const runLeftB = assets.runLeftB;
  const jumpLeftSingle = assets.jumpLeftSingle;
  const jumpRightSingle = assets.jumpRightSingle;
  const jumpSheet = rawAssets ? rawAssets.jumpSheet : null;
  const gunReady = assets.gunReady;
  const shootRight = assets.shootRight;

  const jumpSheetColumns = splitImageColumns(jumpSheet, 2);
  const jumpSheetRight = await processSourceSequentially(
    jumpSheetColumns[0],
    "MC Jump Sheet Right"
  );
  const jumpSheetLeft = await processSourceSequentially(
    jumpSheetColumns[1],
    "MC Jump Sheet Left"
  );
  const referenceSprite =
    idleRight ||
    idleLeft ||
    runRight ||
    runLeftA ||
    jumpRightSingle ||
    jumpLeftSingle ||
    gunReady ||
    shootRight ||
    jumpSheetRight ||
    null;
  const referenceHeight = getSpriteHeight(referenceSprite) || 1;
  const rightIdleSprites = matchSpritesToHeight(
    [idleRight || idleLeft || runRight || gunReady].filter(Boolean),
    referenceHeight
  );
  const leftIdleSprites = matchSpritesToHeight(
    [idleLeft || idleRight || runLeftA || jumpSheetLeft].filter(Boolean),
    referenceHeight
  );
  const rightRunSprites = matchSpritesToHeight(
    [runRight || idleRight].filter(Boolean),
    referenceHeight
  );
  const leftRunSprites = matchSpritesToHeight(
    [runLeftA, runLeftB].filter(Boolean),
    referenceHeight
  );
  const rightJumpSprites = matchSpritesToHeight(
    [jumpLeftSingle || jumpSheetLeft || jumpRightSingle || idleRight].filter(Boolean),
    referenceHeight
  );
  const leftJumpSprites = matchSpritesToHeight(
    [jumpRightSingle || jumpSheetRight || jumpLeftSingle || idleLeft].filter(Boolean),
    referenceHeight
  );
  const rightAttackSprites = matchSpritesToHeight(
    [gunReady || shootRight || idleRight, shootRight || gunReady || idleRight].filter(
      Boolean
    ),
    referenceHeight
  );
  const rightStunnedSprites = matchSpritesToHeight(
    [jumpLeftSingle || jumpSheetLeft || idleRight].filter(Boolean),
    referenceHeight
  );
  const leftStunnedSprites = matchSpritesToHeight(
    [jumpRightSingle || jumpSheetRight || idleLeft].filter(Boolean),
    referenceHeight
  );

  if (
    rightIdleSprites.length === 0 &&
    leftIdleSprites.length === 0 &&
    rightRunSprites.length === 0 &&
    leftRunSprites.length === 0 &&
    rightAttackSprites.length === 0
  ) {
    return null;
  }

  const normalized = normalizeSpriteGroups({
    idleRight: rightIdleSprites,
    idleLeft: leftIdleSprites,
    runRight: rightRunSprites,
    runLeft: leftRunSprites,
    jumpRight: rightJumpSprites,
    jumpLeft: leftJumpSprites,
    attackRight: rightAttackSprites,
    stunnedRight: rightStunnedSprites,
    stunnedLeft: leftStunnedSprites,
    deadRight: rightStunnedSprites.length > 0 ? [getArrayItem(rightStunnedSprites, -1)] : [],
    deadLeft: leftStunnedSprites.length > 0 ? [getArrayItem(leftStunnedSprites, -1)] : [],
  });

  return {
    [ENTITY_STATES.IDLE]: createDirectionalClips(
      normalized.idleRight,
      normalized.idleLeft,
      { frameDuration: 0.2 }
    ),
    [ENTITY_STATES.RUN]: createDirectionalClips(
      normalized.runRight,
      normalized.runLeft,
      { frameDuration: 0.1 }
    ),
    [ENTITY_STATES.ATTACK]: createDirectionalClips(
      normalized.attackRight,
      [],
      {
        frameDuration: 0.08,
        loop: false,
      }
    ),
    [ENTITY_STATES.STUNNED]: createDirectionalClips(
      normalized.stunnedRight,
      normalized.stunnedLeft,
      {
        frameDuration: 0.1,
        loop: false,
      }
    ),
    [ENTITY_STATES.DEAD]: createDirectionalClips(
      normalized.deadRight,
      normalized.deadLeft,
      {
        frameDuration: 0.12,
        loop: false,
      }
    ),
    [ENTITY_STATES.JUMP]: createDirectionalClips(
      normalized.jumpRight,
      normalized.jumpLeft,
      {
        frameDuration: 0.18,
        loop: false,
      }
    ),
    baseHeight: normalized.baseHeight,
  };
}

async function loadEnemyAnimations(rawAssets) {
  const assets = await processSpritesSequentially(rawAssets, ENEMY_ASSET_SPECS);
  const ninjaMovement = rawAssets ? rawAssets.ninjaMovement : null;
  const ninja = assets.ninja;
  const cop = assets.cop;
  const snake = assets.snake;
  const snakeIdleSheet = rawAssets ? rawAssets.snakeIdleSheet : null;
  const snakeAttackSheet = rawAssets ? rawAssets.snakeAttackSheet : null;
  const redNinja = assets.redNinja;
  const blueNinja = assets.blueNinja;
  const redNinjaAttack = assets.redNinjaAttack;
  const blueNinjaAttack = assets.blueNinjaAttack;
  const swatLegacy = assets.swatLegacy;
  const swatIdle = assets.swatIdle;
  const swatWalkLeft = assets.swatWalkLeft;
  const swatWalkRight = assets.swatWalkRight;
  const swatShootLeft = assets.swatShootLeft;
  const swatShootRight = assets.swatShootRight;
  const swatLegacyShootLeft = assets.swatLegacyShootLeft;
  const swatLegacyShootRight = assets.swatLegacyShootRight;
  const bulldogMovement = rawAssets ? rawAssets.bulldogMovement : null;
  const bulldogAttack = rawAssets ? rawAssets.bulldogAttack : null;
  const bulldog = assets.bulldog;

  if (
    !ninjaMovement &&
    !ninja &&
    !cop &&
    !snake &&
    !snakeIdleSheet &&
    !snakeAttackSheet &&
    !redNinja &&
    !blueNinja &&
    !redNinjaAttack &&
    !blueNinjaAttack &&
    !swatLegacy &&
    !swatIdle &&
    !swatWalkLeft &&
    !swatWalkRight &&
    !swatShootLeft &&
    !swatShootRight &&
    !swatLegacyShootLeft &&
    !swatLegacyShootRight &&
    !bulldogMovement &&
    !bulldogAttack &&
    !bulldog
  ) {
    return null;
  }

  const [ninjaTop, ninjaBottom] = splitImageRows(ninjaMovement, 2);
  const [bulldogMoveTop, bulldogMoveBottom] = splitImageRows(
    bulldogMovement,
    2
  );
  const [bulldogAttackTop, bulldogAttackBottom] = splitImageRows(
    bulldogAttack,
    2
  );
  const snakeIdleSprites = snakeIdleSheet
    ? await extractRowFrameSpritesSequential(
        snakeIdleSheet,
        2,
        1,
        3,
        "Snake Idle"
      )
    : [];
  const snakeAttackSprites = snakeAttackSheet
    ? await extractRowFrameSpritesSequential(
        snakeAttackSheet,
        2,
        1,
        3,
        "Snake Attack"
      )
    : [];

  const ninjaTopStrip = await processSourceSequentially(ninjaTop, "Ninja Move Top");
  const ninjaBottomStrip = await processSourceSequentially(
    ninjaBottom,
    "Ninja Move Bottom"
  );
  const bulldogMoveTopStrip = await processSourceSequentially(
    bulldogMoveTop,
    "Bulldog Move Top"
  );
  const bulldogMoveBottomStrip = await processSourceSequentially(
    bulldogMoveBottom,
    "Bulldog Move Bottom"
  );
  const bulldogAttackTopStrip = await processSourceSequentially(
    bulldogAttackTop,
    "Bulldog Attack Top"
  );
  const bulldogAttackBottomStrip = await processSourceSequentially(
    bulldogAttackBottom,
    "Bulldog Attack Bottom"
  );

  const ninjaRunFrames = mergeFrames(
    splitFrames(ninjaTopStrip, 4),
    splitFrames(ninjaBottomStrip, 3)
  );
  const ninjaIdleFrames = mergeFrames(splitFrames(ninjaBottomStrip, 3));
  const ninjaIdleFrame =
    getArrayItem(ninjaIdleFrames, 1) ||
    ninjaIdleFrames[0] ||
    createFrame(ninja);

  const bulldogRunFrames = mergeFrames(
    splitFrames(bulldogMoveTopStrip, 2),
    splitFrames(bulldogMoveBottomStrip, 2)
  );
  const bulldogAttackFrames = mergeFrames(
    splitFrames(bulldogAttackTopStrip, 2),
    splitFrames(bulldogAttackBottomStrip, 2)
  );
  const normalizedSnake = normalizeSpriteGroups({
    idle:
      snakeIdleSprites.length > 0
        ? snakeIdleSprites
        : [snake].filter(Boolean),
    attack:
      snakeAttackSprites.length > 0
        ? snakeAttackSprites
        : [snake].filter(Boolean),
  });
  const swatIdleRightSprite =
    swatIdle || swatWalkRight || swatLegacy || swatLegacyShootRight || null;
  const swatIdleLeftSprite =
    swatWalkLeft || flipSprite(swatIdleRightSprite) || swatIdleRightSprite;
  const swatShootRightSprite =
    swatShootRight || swatLegacyShootRight || swatIdleRightSprite;
  const swatShootLeftSprite =
    swatShootLeft || swatLegacyShootLeft || flipSprite(swatShootRightSprite);
  const swatReferenceHeight =
    getSpriteHeight(swatIdleRightSprite) ||
    getSpriteHeight(swatWalkRight) ||
    getSpriteHeight(swatWalkLeft) ||
    getSpriteHeight(swatShootRightSprite) ||
    getSpriteHeight(swatShootLeftSprite) ||
    1;
  const normalizedSwat = normalizeSpriteGroups({
    idleRight: matchSpritesToHeight([swatIdleRightSprite].filter(Boolean), swatReferenceHeight),
    idleLeft: matchSpritesToHeight([swatIdleLeftSprite].filter(Boolean), swatReferenceHeight),
    runRight: matchSpritesToHeight(
      [swatWalkRight || swatIdleRightSprite, swatIdleRightSprite].filter(Boolean),
      swatReferenceHeight
    ),
    runLeft: matchSpritesToHeight(
      [swatWalkLeft || swatIdleLeftSprite, swatIdleLeftSprite].filter(Boolean),
      swatReferenceHeight
    ),
    attackRight: matchSpritesToHeight([swatShootRightSprite].filter(Boolean), swatReferenceHeight),
    attackLeft: matchSpritesToHeight([swatShootLeftSprite].filter(Boolean), swatReferenceHeight),
    stunnedRight: matchSpritesToHeight([swatIdleRightSprite].filter(Boolean), swatReferenceHeight),
    stunnedLeft: matchSpritesToHeight([swatIdleLeftSprite].filter(Boolean), swatReferenceHeight),
    deadRight: matchSpritesToHeight([swatShootRightSprite].filter(Boolean), swatReferenceHeight),
    deadLeft: matchSpritesToHeight([swatShootLeftSprite].filter(Boolean), swatReferenceHeight),
  });

  return {
    ninja: {
      [ENTITY_STATES.IDLE]: createClip(
        mergeFrames(ninjaIdleFrame),
        { frameDuration: 0.18 }
      ),
      [ENTITY_STATES.RUN]: createClip(
        ninjaRunFrames.length > 0
          ? ninjaRunFrames
          : mergeFrames(createFrame(ninja)),
        { frameDuration: 0.12 }
      ),
      [ENTITY_STATES.ATTACK]: createClip(
        mergeFrames(createFrame(ninja), getArrayItem(ninjaRunFrames, 0)),
        { frameDuration: 0.08, loop: false }
      ),
      [ENTITY_STATES.STUNNED]: createClip(
        mergeFrames(getArrayItem(ninjaIdleFrames, 1), createFrame(ninja)),
        { frameDuration: 0.1, loop: false }
      ),
      [ENTITY_STATES.DEAD]: createClip(
        mergeFrames(getArrayItem(ninjaIdleFrames, -1), createFrame(ninja)),
        { frameDuration: 0.12, loop: false }
      ),
      baseHeight:
        getSpriteHeight(ninjaTopStrip) ||
        getSpriteHeight(ninjaBottomStrip) ||
        getSpriteHeight(ninja) ||
        1,
    },
    cop: createStaticAnimationSet(cop, { baseHeight: getSpriteHeight(cop) || 1 }),
    snake: {
      [ENTITY_STATES.IDLE]: clipFromSprites(normalizedSnake.idle, {
        frameDuration: 0.2,
      }),
      [ENTITY_STATES.RUN]: clipFromSprites(normalizedSnake.idle, {
        frameDuration: 0.18,
      }),
      [ENTITY_STATES.ATTACK]: clipFromSprites(normalizedSnake.attack, {
        frameDuration: 0.09,
        loop: false,
      }),
      [ENTITY_STATES.STUNNED]: clipFromSprites(
        [
          getArrayItem(normalizedSnake.idle, 1) ||
            normalizedSnake.idle[0] ||
            normalizedSnake.attack[0],
        ].filter(Boolean),
        { frameDuration: 0.12, loop: false }
      ),
      [ENTITY_STATES.DEAD]: clipFromSprites(
        [
          getArrayItem(normalizedSnake.attack, -1) ||
            getArrayItem(normalizedSnake.idle, -1) ||
            normalizedSnake.idle[0],
        ].filter(Boolean),
        { frameDuration: 0.12, loop: false }
      ),
      baseHeight: normalizedSnake.baseHeight,
    },
    redNinja: createStaticAnimationSet(redNinja, {
      attack: redNinjaAttack,
      baseHeight: getSpriteHeight(redNinja) || getSpriteHeight(redNinjaAttack) || 1,
    }),
    blueNinja: createStaticAnimationSet(blueNinja, {
      attack: blueNinjaAttack,
      baseHeight: getSpriteHeight(blueNinja) || getSpriteHeight(blueNinjaAttack) || 1,
    }),
    swat: {
      [ENTITY_STATES.IDLE]: createDirectionalClips(
        normalizedSwat.idleRight,
        normalizedSwat.idleLeft,
        { frameDuration: 0.2 }
      ),
      [ENTITY_STATES.RUN]: createDirectionalClips(
        normalizedSwat.runRight,
        normalizedSwat.runLeft,
        { frameDuration: 0.14 }
      ),
      [ENTITY_STATES.ATTACK]: clipFromSprites(normalizedSwat.attackRight, {
        frameDuration: 0.08,
        loop: false,
        facing: 1,
      }),
      attackLeft: clipFromSprites(normalizedSwat.attackLeft, {
        frameDuration: 0.08,
        loop: false,
        facing: -1,
      }),
      attackRight: clipFromSprites(normalizedSwat.attackRight, {
        frameDuration: 0.08,
        loop: false,
        facing: 1,
      }),
      [ENTITY_STATES.STUNNED]: createDirectionalClips(
        normalizedSwat.stunnedRight,
        normalizedSwat.stunnedLeft,
        {
          frameDuration: 0.1,
          loop: false,
        }
      ),
      [ENTITY_STATES.DEAD]: createDirectionalClips(
        normalizedSwat.deadRight,
        normalizedSwat.deadLeft,
        {
          frameDuration: 0.12,
          loop: false,
        }
      ),
      baseHeight: normalizedSwat.baseHeight,
    },
    bulldog: {
      [ENTITY_STATES.IDLE]: createClip(
        mergeFrames(
          getArrayItem(bulldogRunFrames, 0),
          createFrame(bulldog)
        ),
        { frameDuration: 0.16 }
      ),
      [ENTITY_STATES.RUN]: createClip(
        bulldogRunFrames.length > 0
          ? bulldogRunFrames
          : mergeFrames(createFrame(bulldog)),
        { frameDuration: 0.11 }
      ),
      [ENTITY_STATES.ATTACK]: createClip(
        bulldogAttackFrames.length > 0
          ? bulldogAttackFrames
          : mergeFrames(createFrame(bulldog)),
        { frameDuration: 0.09, loop: false }
      ),
      [ENTITY_STATES.STUNNED]: createClip(
        mergeFrames(
          getArrayItem(bulldogAttackFrames, 0),
          getArrayItem(bulldogRunFrames, 0),
          createFrame(bulldog)
        ),
        { frameDuration: 0.1, loop: false }
      ),
      [ENTITY_STATES.DEAD]: createClip(
        mergeFrames(
          getArrayItem(bulldogAttackFrames, -1),
          getArrayItem(bulldogRunFrames, -1),
          createFrame(bulldog)
        ),
        { frameDuration: 0.12, loop: false }
      ),
      baseHeight:
        getSpriteHeight(bulldogMoveTopStrip) ||
        getSpriteHeight(bulldogMoveBottomStrip) ||
        getSpriteHeight(bulldog) ||
        1,
    },
  };
}

async function loadTileSprites(rawAssets) {
  const assets = await processSpritesSequentially(rawAssets, TILE_ASSET_SPECS);
  const grass = assets.grass;

  if (!grass) return null;
  return { grass };
}

async function loadPowerUpSprites(rawAssets) {
  const assets = await processSpritesSequentially(rawAssets, POWER_UP_ASSET_SPECS);
  const gun = assets.gun;
  const health = assets.health;

  if (!gun && !health) return null;
  return { gun, health };
}

async function loadBossAnimations(rawAssets) {
  const assets = await processSpritesSequentially(rawAssets, BOSS_ASSET_SPECS);
  const idlePrimary = assets.idlePrimary;
  const idleRight = assets.idleRight;
  const idleLeft = assets.idleLeft;
  const walkCenter = assets.walkCenter;
  const walkRightA = assets.walkRightA;
  const walkRightB = assets.walkRightB;
  const walkLeftA = assets.walkLeftA;
  const chargeLeftA = assets.chargeLeftA;
  const chargeLeftB = assets.chargeLeftB;
  const swipeLeft = assets.swipeLeft;
  const swipeRight = assets.swipeRight;
  const shootLeft = assets.shootLeft;
  const shootRight = assets.shootRight;
  const gunLeft = assets.gunLeft;
  const gunRight = assets.gunRight;

  const resolvedIdleRight =
    idlePrimary || idleRight || gunRight || shootRight || gunLeft || null;
  const resolvedIdleLeft = idleLeft || gunLeft || shootLeft || flipSprite(resolvedIdleRight);
  const resolvedWalkCenter =
    walkCenter || resolvedIdleRight || resolvedIdleLeft || gunRight || gunLeft || null;
  const resolvedWalkRightA = walkRightA || resolvedWalkCenter || resolvedIdleRight;
  const resolvedWalkRightB =
    walkRightB || flipSprite(walkLeftA) || resolvedWalkRightA || resolvedWalkCenter;
  const resolvedWalkLeftA =
    walkLeftA || flipSprite(resolvedWalkRightA) || resolvedWalkCenter || resolvedIdleLeft;
  const resolvedWalkLeftB =
    flipSprite(resolvedWalkRightB) ||
    flipSprite(resolvedWalkRightA) ||
    resolvedWalkLeftA ||
    resolvedWalkCenter;
  const resolvedSwipeLeft = swipeLeft || resolvedIdleLeft || resolvedIdleRight;
  const resolvedSwipeRight =
    swipeRight || flipSprite(resolvedSwipeLeft) || gunRight || shootRight || resolvedIdleRight;
  const resolvedChargeLeftA = chargeLeftA || resolvedIdleLeft || resolvedSwipeLeft;
  const resolvedChargeLeftB = chargeLeftB || resolvedChargeLeftA || resolvedIdleLeft;
  const resolvedChargeRightA =
    flipSprite(resolvedChargeLeftA) || shootRight || gunRight || resolvedIdleRight;
  const resolvedChargeRightB =
    flipSprite(resolvedChargeLeftB) || resolvedChargeRightA || resolvedIdleRight;
  const resolvedChargeRight = resolvedChargeRightA;
  const resolvedChargeLeft =
    shootLeft || gunLeft || resolvedChargeLeftA || flipSprite(resolvedChargeRight) || resolvedIdleLeft;
  const walkRightFrames = [
    resolvedWalkCenter || resolvedWalkRightA,
    resolvedWalkRightA,
    resolvedWalkRightB,
    resolvedWalkRightA,
  ].filter(Boolean);
  const walkLeftFrames = [
    flipSprite(resolvedWalkCenter) || resolvedWalkLeftA,
    resolvedWalkLeftA,
    resolvedWalkLeftB,
    resolvedWalkLeftA,
  ].filter(Boolean);
  const groundPoundRightFrames = [
    resolvedWalkCenter || resolvedIdleRight || resolvedChargeRightA || resolvedSwipeRight,
  ].filter(Boolean);
  const groundPoundLeftFrames = [
    flipSprite(resolvedWalkCenter) || resolvedIdleLeft || resolvedChargeLeftA || resolvedSwipeLeft,
  ].filter(Boolean);

  if (!resolvedIdleRight && !resolvedIdleLeft && !resolvedSwipeLeft) {
    return null;
  }

  const referenceHeight =
    getSpriteHeight(resolvedIdleRight) ||
    getSpriteHeight(resolvedWalkCenter) ||
    getSpriteHeight(resolvedWalkRightA) ||
    getSpriteHeight(resolvedIdleLeft) ||
    getSpriteHeight(resolvedSwipeLeft) ||
    1;
  const normalized = normalizeSpriteGroups({
    idleRight: matchSpritesToHeight([resolvedIdleRight].filter(Boolean), referenceHeight),
    idleLeft: matchSpritesToHeight([resolvedIdleLeft].filter(Boolean), referenceHeight),
    walkRight: matchSpritesToHeight(walkRightFrames, referenceHeight),
    walkLeft: matchSpritesToHeight(walkLeftFrames, referenceHeight),
    groundPoundRight: matchSpritesToHeight(groundPoundRightFrames, referenceHeight),
    groundPoundLeft: matchSpritesToHeight(groundPoundLeftFrames, referenceHeight),
    swipeRight: matchSpritesToHeight(
      [resolvedSwipeRight || resolvedIdleRight].filter(Boolean),
      referenceHeight
    ),
    swipeLeft: matchSpritesToHeight(
      [resolvedSwipeLeft || resolvedIdleLeft].filter(Boolean),
      referenceHeight
    ),
    chargeRight: matchSpritesToHeight(
      [resolvedChargeRightA, resolvedChargeRightB, resolvedIdleRight].filter(Boolean),
      referenceHeight
    ),
    chargeLeft: matchSpritesToHeight(
      [resolvedChargeLeftA, resolvedChargeLeftB, resolvedIdleLeft].filter(Boolean),
      referenceHeight
    ),
    shootRight: matchSpritesToHeight(
      [gunRight || resolvedIdleRight, shootRight || gunRight || resolvedIdleRight].filter(Boolean),
      referenceHeight
    ),
    shootLeft: matchSpritesToHeight(
      [gunLeft || resolvedIdleLeft, shootLeft || gunLeft || resolvedIdleLeft].filter(Boolean),
      referenceHeight
    ),
    stunnedRight: matchSpritesToHeight([resolvedIdleRight].filter(Boolean), referenceHeight),
    stunnedLeft: matchSpritesToHeight([resolvedIdleLeft].filter(Boolean), referenceHeight),
    transitionRight: matchSpritesToHeight([resolvedChargeRight].filter(Boolean), referenceHeight),
    transitionLeft: matchSpritesToHeight([resolvedChargeLeft].filter(Boolean), referenceHeight),
    defeatedRight: matchSpritesToHeight([resolvedIdleRight].filter(Boolean), referenceHeight),
    defeatedLeft: matchSpritesToHeight([resolvedIdleLeft].filter(Boolean), referenceHeight),
  });

  return {
    idle: createDirectionalClips(normalized.idleRight, normalized.idleLeft, {
      frameDuration: 0.18,
    }),
    walk: createDirectionalClips(normalized.walkRight, normalized.walkLeft, {
      frameDuration: 0.11,
    }),
    ground_pound: createDirectionalClips(
      normalized.groundPoundRight,
      normalized.groundPoundLeft,
      { frameDuration: 0.14, loop: false }
    ),
    charge: createDirectionalClips(normalized.chargeRight, normalized.chargeLeft, {
      frameDuration: 0.1,
      loop: false,
    }),
    swipe: createDirectionalClips(normalized.swipeRight, normalized.swipeLeft, {
      frameDuration: 0.1,
      loop: false,
    }),
    shoot: createDirectionalClips(normalized.shootRight, normalized.shootLeft, {
      frameDuration: 0.1,
      loop: false,
    }),
    stunned: createDirectionalClips(normalized.stunnedRight, normalized.stunnedLeft, {
      frameDuration: 0.12,
      loop: false,
    }),
    transition: createDirectionalClips(
      normalized.transitionRight,
      normalized.transitionLeft,
      { frameDuration: 0.12 }
    ),
    defeated: createDirectionalClips(
      normalized.defeatedRight,
      normalized.defeatedLeft,
      { frameDuration: 0.16, loop: false }
    ),
    baseHeight: normalized.baseHeight,
  };
}

function buildEnemyScales(animationSets) {
  if (!animationSets) return null;
  const scales = {};
  if (getAnimationBaseHeight(animationSets.ninja)) {
    scales.ninja = 26 / getAnimationBaseHeight(animationSets.ninja);
  }
  if (getAnimationBaseHeight(animationSets.redNinja)) {
    scales.redNinja = 26 / getAnimationBaseHeight(animationSets.redNinja);
  }
  if (getAnimationBaseHeight(animationSets.blueNinja)) {
    scales.blueNinja = 26 / getAnimationBaseHeight(animationSets.blueNinja);
  }
  if (getAnimationBaseHeight(animationSets.cop)) {
    scales.cop = 28 / getAnimationBaseHeight(animationSets.cop);
  }
  if (getAnimationBaseHeight(animationSets.swat)) {
    scales.swat = 28 / getAnimationBaseHeight(animationSets.swat);
  }
  if (getAnimationBaseHeight(animationSets.snake)) {
    scales.snake = 14 / getAnimationBaseHeight(animationSets.snake);
  }
  if (getAnimationBaseHeight(animationSets.bulldog)) {
    scales.bulldog = 16 / getAnimationBaseHeight(animationSets.bulldog);
  }
  return scales;
}

function splitImageRows(image, rowCount) {
  if (!image || rowCount <= 0) return [];
  const rows = [];
  for (let row = 0; row < rowCount; row += 1) {
    const startY = Math.round((row * image.height) / rowCount);
    const endY = Math.round(((row + 1) * image.height) / rowCount);
    rows.push(
      cropImage(image, {
        x: 0,
        y: startY,
        w: image.width,
        h: Math.max(1, endY - startY),
      })
    );
  }
  return rows;
}

function splitImageColumns(image, columnCount) {
  if (!image || columnCount <= 0) return [];
  const columns = [];
  for (let column = 0; column < columnCount; column += 1) {
    const startX = Math.round((column * image.width) / columnCount);
    const endX = Math.round(((column + 1) * image.width) / columnCount);
    columns.push(
      cropImage(image, {
        x: startX,
        y: 0,
        w: Math.max(1, endX - startX),
        h: image.height,
      })
    );
  }
  return columns;
}

function cropImage(image, rect) {
  if (!image || !rect) return image;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.w));
  canvas.height = Math.max(1, Math.round(rect.h));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    image,
    Math.round(rect.x),
    Math.round(rect.y),
    Math.round(rect.w),
    Math.round(rect.h),
    0,
    0,
    canvas.width,
    canvas.height
  );
  return canvas;
}

function flipSprite(sprite) {
  if (!sprite) return null;
  const canvas = document.createElement("canvas");
  canvas.width = sprite.width;
  canvas.height = sprite.height;
  const ctx = canvas.getContext("2d");
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(sprite, 0, 0);
  return canvas;
}

function normalizeSpriteGroups(groups) {
  let maxWidth = 1;
  let maxHeight = 1;

  const groupValues = Object.values(groups);
  for (let i = 0; i < groupValues.length; i += 1) {
    const sprites = groupValues[i];
    if (!sprites) continue;
    for (let j = 0; j < sprites.length; j += 1) {
      const sprite = sprites[j];
      if (!sprite) continue;
      maxWidth = Math.max(maxWidth, sprite.width);
      maxHeight = Math.max(maxHeight, sprite.height);
    }
  }

  const normalized = { baseWidth: maxWidth, baseHeight: maxHeight };
  for (const [key, sprites] of Object.entries(groups)) {
    normalized[key] = sprites
      .filter(Boolean)
      .map((sprite) => padSprite(sprite, maxWidth, maxHeight));
  }

  return normalized;
}

function padSprite(sprite, width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const drawX = Math.round((width - sprite.width) / 2);
  const drawY = Math.round(height - sprite.height);
  ctx.drawImage(sprite, drawX, drawY);
  return canvas;
}

function scaleSpritesToHeight(sprites, targetHeight) {
  return sprites.map((sprite) => scaleSpriteToHeight(sprite, targetHeight));
}

function matchSpritesToHeight(sprites, targetHeight, tolerance = 0.08) {
  return sprites
    .filter(Boolean)
    .map((sprite) => matchSpriteToHeight(sprite, targetHeight, tolerance));
}

function scaleSpriteToHeight(sprite, targetHeight) {
  if (!sprite || !targetHeight || sprite.height <= targetHeight * 1.15) {
    return sprite;
  }

  const scale = targetHeight / sprite.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sprite.width * scale));
  canvas.height = Math.max(1, Math.round(sprite.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function matchSpriteToHeight(sprite, targetHeight, tolerance = 0.08) {
  if (!sprite || !targetHeight) return sprite;
  const ratio = sprite.height / targetHeight;
  if (Math.abs(1 - ratio) <= tolerance) {
    return sprite;
  }

  const scale = targetHeight / sprite.height;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sprite.width * scale));
  canvas.height = Math.max(1, Math.round(sprite.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function splitFrames(image, frameCount) {
  return image ? splitSpriteSheet(image, frameCount) : [];
}

function clipFromSprites(sprites, options = {}) {
  return createClip(
    sprites.filter(Boolean).map((sprite) => createFrame(sprite)),
    options
  );
}

function getArrayItem(items, index) {
  if (!items || items.length === 0) return null;
  const resolvedIndex = index < 0 ? items.length + index : index;
  if (resolvedIndex < 0 || resolvedIndex >= items.length) return null;
  return items[resolvedIndex];
}

function getSpriteHeight(sprite) {
  return sprite && sprite.height ? sprite.height : 0;
}

function getAnimationBaseHeight(animationSet) {
  return animationSet && animationSet.baseHeight ? animationSet.baseHeight : 0;
}

function createDirectionalClips(rightSprites, leftSprites, options = {}) {
  const rightClip = clipFromSprites(rightSprites, { ...options, facing: 1 });
  const leftClip = clipFromSprites(leftSprites, { ...options, facing: -1 });
  if (!rightClip && !leftClip) return null;
  return {
    right: rightClip || leftClip,
    left: leftClip || rightClip,
  };
}

function createStaticAnimationSet(image, options = {}) {
  const idle = createFrame(image);
  const attack = createFrame(options.attack || image);
  const dead = createFrame(options.dead || options.attack || image);

  return {
    [ENTITY_STATES.IDLE]: createClip(mergeFrames(idle), { frameDuration: 0.2 }),
    [ENTITY_STATES.RUN]: createClip(mergeFrames(idle), { frameDuration: 0.15 }),
    [ENTITY_STATES.ATTACK]: createClip(mergeFrames(attack || idle), {
      frameDuration: 0.08,
      loop: false,
    }),
    [ENTITY_STATES.STUNNED]: createClip(mergeFrames(idle), {
      frameDuration: 0.1,
      loop: false,
    }),
    [ENTITY_STATES.DEAD]: createClip(mergeFrames(dead || idle), {
      frameDuration: 0.12,
      loop: false,
    }),
    baseHeight: options.baseHeight || getSpriteHeight(image) || 1,
  };
}

function createMusic(path, baseVolume = 1) {
  const audio = new Audio(resolveUrl(path));
  audio._nativePlay = audio.play.bind(audio);
  audio.loop = true;
  audio.preload = "auto";
  audio.load();
  audio.baseVolume = baseVolume;
  audio._masterVolume = 0.6;
  return audio;
}

function createSfx(path, options = {}) {
  const poolSize =
    options.poolSize !== undefined && options.poolSize !== null
      ? options.poolSize
      : 4;
  const baseVolume =
    options.volume !== undefined && options.volume !== null
      ? options.volume
      : 1;
  const clips = Array.from({ length: poolSize }, () => {
    const clip = new Audio(resolveUrl(path));
    clip._nativePlay = clip.play.bind(clip);
    clip.preload = "auto";
    clip.load();
    clip._masterVolume = 0.6;
    return clip;
  });
  let index = 0;
  let primed = false;
  return {
    baseVolume,
    setVolume(masterVolume) {
      const volume = masterVolume * baseVolume;
      clips.forEach((clip) => {
        clip._masterVolume = masterVolume;
        clip.volume = volume;
      });
    },
    setMuted(muted) {
      clips.forEach((clip) => {
        clip.muted = !!muted;
      });
    },
    prime() {
      if (primed) return;
      primed = true;
      // Intentionally no-op. Modern browsers only need the audio context
      // unlocked by a user gesture; pre-playing every clip causes audible bursts.
    },
    play() {
      if (!audioManager.unlocked) return;
      const clip = clips[index];
      index = (index + 1) % clips.length;
      clip.currentTime = 0;
      clip.play().catch(function() {});
    },
  };
}

function encodePath(path) {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function resolveUrl(path) {
  return new URL(encodePath(path), import.meta.url).href;
}

function applyAudioState(music, sfx, state, extraMusic = []) {
  const volume = state.muted ? 0 : state.volume;
  audioManager.masterVolume = volume;
  [music, ...extraMusic].filter(Boolean).forEach((track) => {
    track._masterVolume = volume;
    track.muted = !!state.muted;
    track.volume =
      volume *
      (track.baseVolume !== undefined && track.baseVolume !== null
        ? track.baseVolume
        : 1);
  });
  if (sfx) {
    Object.values(sfx).forEach((sound) => {
      sound.setVolume(volume);
      if (sound.setMuted) {
        sound.setMuted(state.muted);
      }
    });
  }
}

function startMusic(audio) {
  if (!audio) return;

  function tryPlay() {
    audio.volume = 0;
    const playFn = audio._nativePlay || audio.play.bind(audio);
    const promise = playFn();
    if (promise && typeof promise.then === "function") {
      promise.then(function() {
        let vol = 0;
        const target =
          (audio.baseVolume || 0.3) * (audioManager.masterVolume || 0.6);
        const fade = setInterval(function() {
          vol += 0.03;
          if (vol >= target) {
            audio.volume = target;
            clearInterval(fade);
          } else {
            audio.volume = vol;
          }
        }, 50);
      }).catch(function() {
        audioManager.pendingUnlock.push(tryPlay);
      });
    }
  }

  if (audioManager.unlocked) {
    tryPlay();
  } else {
    audioManager.pendingUnlock.push(tryPlay);
  }
}

function setupAudioStart(audio, sfx) {
  if (!audio && !sfx) return;
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    audioManager.unlock()
      .then(function() {
        startMusic(audio);
      })
      .catch(() => {
        started = false;
      });
  };
  window.addEventListener("keydown", start, { once: true });
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("touchstart", start, { once: true });
}

function setupAudioControls(music, sfx, state, extraMusic = []) {
  if (!music && !sfx) return;
  const clampVolume = (value) => Math.max(0, Math.min(1, value));
  const apply = () => applyAudioState(music, sfx, state, extraMusic);
  const syncWindowMute = () => {
    window.__blockhot_muted = !!state.muted;
    if (typeof window.__blockhot_updateAudioButton === "function") {
      window.__blockhot_updateAudioButton(window.__blockhot_muted);
    }
  };

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
    syncWindowMute();
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
    syncWindowMute();
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

  window.__blockhot_setMuted = (muted) => {
    state.muted = !!muted;
    if (state.muted && state.volume > 0) {
      state.lastVolume = state.volume;
    }
    if (!state.muted && state.volume === 0) {
      state.volume = state.lastVolume || 0.35;
    }
    syncWindowMute();
    apply();
  };

  syncWindowMute();
  apply();
}

function processSprite(img) {
  const maxHeight = 400;
  const scale = img.height > maxHeight ? maxHeight / img.height : 1;
  const scaledWidth = Math.max(1, Math.round(img.width * scale));
  const scaledHeight = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = scaledWidth;
  canvas.height = scaledHeight;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const { data } = imageData;
  const width = canvas.width;
  const height = canvas.height;
  const visited = new Uint8Array(width * height);
  const stack = [];

  for (let x = 0; x < width; x += 1) {
    stack.push(x);
    if (height > 1) stack.push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y += 1) {
    stack.push(y * width);
    if (width > 1) stack.push(y * width + (width - 1));
  }

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
    const isNeutralLight = max - min < 60 && brightness > 150;
    const isNearWhite = brightness > 205;
    const isSoftPaper = min > 145 && brightness > 165;
    const isBackground = isNearWhite || isSoftPaper || isNeutralLight;
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
