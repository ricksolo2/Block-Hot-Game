import { Game } from "./game.js?v=17";
import {
  ENTITY_STATES,
  createClip,
  createFrame,
  mergeFrames,
  splitSpriteSheet,
} from "./animation.js?v=4";
import { Input } from "./input.js?v=5";
import { loadLevel } from "./level.js?v=7";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const loadingEl = document.getElementById("loading");

const input = new Input(window);
init().catch(function(error) {
  console.error("BlockHot failed to boot.", error);
  loadingEl.textContent = `Failed to load game: ${error.message || error}`;
});

async function init() {
  const [
    level1,
    level2,
    level3,
    level4,
    background1,
    background2,
    background3Primary,
    background3Alt,
    background3Fallback,
    background4,
    menuImage,
    playerAnimations,
    enemyAnimations,
    bossAnimations,
    tileSprites,
    powerUpSprites,
  ] = await Promise.all([
    loadLevel(resolveUrl("../levels/level1.json")),
    loadLevel(resolveUrl("../levels/level2.json")),
    loadLevel(resolveUrl("../levels/level3.json")),
    loadLevel(resolveUrl("../levels/level4.json")),
    loadImage("../assets/background.png"),
    loadImage("../assets/Level 2 background .png"),
    loadImage("../assets/Level 3 Background .png"),
    loadImage("../assets/Level 3 background .png"),
    loadImage("../assets/O-Block Background.png"),
    loadImage("../assets/level 4 background.png"),
    loadImage("../assets/Loading Screen.png"),
    loadPlayerAnimations(),
    loadEnemyAnimations(),
    loadBossAnimations(),
    loadTileSprites(),
    loadPowerUpSprites(),
  ]);
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

  const music = createMusic("../audio/2012 Drill x Lofi Hype.mp3", 0.3);
  const bossMusic = createMusic("../audio/Boss Level Drill (Take 2).mp3", 0.38);
  const sfx = {
    gun: createSfx("../audio/GUNPis-Generate_a_20-second-Elevenlabs.mp3", {
      volume: 1,
      poolSize: 10,
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
    bulldog: createSfx("../audio/Bulldog_growling_agg_#4-1767427632987.mp3", {
      volume: 0.8,
      poolSize: 4,
    }),
    bossLaugh: createSfx("../audio/Boss Laugh sound.mp3", {
      volume: 0.9,
      poolSize: 2,
    }),
    bossDrop: createSfx("../audio/Boss Drop impact sound.mp3", {
      volume: 0.95,
      poolSize: 2,
    }),
    bossGun: createSfx("../audio/Boss Gun shooting sound.mp3", {
      volume: 0.95,
      poolSize: 5,
    }),
    bossHurt: createSfx("../audio/Boss Injured sound.mp3", {
      volume: 0.9,
      poolSize: 4,
    }),
  };
  const audioState = {
    volume: 0.6,
    muted: false,
    lastVolume: 0.6,
    step: 0.1,
  };
  applyAudioState(music, sfx, audioState, [bossMusic]);

  const game = new Game(canvas, ctx, input, levels[0].level, {
    levels,
    background: levels[0].background,
    menuImage,
    playerAnimations,
    spriteScale,
    enemyAnimations,
    enemyScales,
    bossAnimations,
    bossScale,
    powerUpSprites,
    tileSprites,
    sfx,
  });
  game.music = music;
  game.bossMusic = bossMusic;
  game.audioState = audioState;

  loadingEl.style.display = "none";
  game.start();
  window.addEventListener("resize", () => game.resize());
  setupAudioStart(music, sfx);
  setupAudioControls(music, sfx, audioState, [bossMusic]);
}

function loadImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = resolveUrl(path);
  });
}

async function loadPlayerAnimations() {
  const [
    idleRight,
    idleLeft,
    runRight,
    runLeftA,
    runLeftB,
    jumpLeftSingle,
    jumpRightSingle,
    jumpSheet,
    gunReady,
    shootRight,
  ] =
    await Promise.all([
      loadSprite("../assets/MC idle standing right.jpg"),
      loadSprite("../assets/MC idle standing left.jpg"),
      loadSprite("../assets/MC running right (1) jpg.jpg"),
      loadSprite("../assets/MC running left (1).jpg"),
      loadSprite("../assets/MC running left-2 .jpg"),
      loadSprite("../assets/MC jumping .jpg"),
      loadSprite("../assets/MC jumping right.png"),
      loadImage("../assets/Gemini_Generated_Image_ixbq8gixbq8gixbq.png"),
      loadSprite("../assets/MC with Gun (1) .jpg"),
      loadSprite("../assets/MC Shooting right.jpg"),
    ]);

  const [jumpSheetRight, jumpSheetLeft] = splitImageColumns(jumpSheet, 2)
    .map((image) => processSource(image))
    .filter(Boolean);
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

async function loadEnemyAnimations() {
  const [
    ninjaMovement,
    ninja,
    cop,
    snake,
    snakeIdleSheet,
    snakeAttackSheet,
    redNinja,
    blueNinja,
    redNinjaAttack,
    blueNinjaAttack,
    swatLegacy,
    swatIdle,
    swatWalkLeft,
    swatWalkRight,
    swatShootLeft,
    swatShootRight,
    swatLegacyShootLeft,
    swatLegacyShootRight,
    bulldogMovement,
    bulldogAttack,
    bulldog,
  ] = await Promise.all([
    loadImage("../assets/Ninja_attacker_movement.png"),
    loadSprite("../assets/Ninja Attacker.png"),
    loadSprite("../assets/Police Character .png"),
    loadSprite("../assets/Snake in Grass.png"),
    loadImage("../assets/Snake_in_grass_idle.png"),
    loadImage("../assets/Snake_in_grass_attack.png"),
    loadSprite("../assets/Red Ninja - L2 .png"),
    loadSprite("../assets/Blue Ninja - L2.png"),
    loadSprite("../assets/Red Ninja Attacking .png"),
    loadSprite("../assets/Blue ninja attacking .png"),
    loadSprite("../assets/Swat Cops - L2.png"),
    loadSprite("../assets/Swat idle standing.png"),
    loadSprite("../assets/Swat walking left.png"),
    loadSprite("../assets/Swat walking right.png"),
    loadSprite("../assets/Swat shooting left.png"),
    loadSprite("../assets/Swat shooting right.png"),
    loadSprite("../assets/Swat with Gub left.png"),
    loadSprite("../assets/Swat with Gun right.png"),
    loadImage("../assets/bulldog_movement.png"),
    loadImage("../assets/bulldog_attack.png"),
    loadSprite("../assets/Bulldog - L2.png"),
  ]);

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
    ? extractRowFrameSprites(snakeIdleSheet, 2, 1, 3)
    : [];
  const snakeAttackSprites = snakeAttackSheet
    ? extractRowFrameSprites(snakeAttackSheet, 2, 1, 3)
    : [];

  const ninjaTopStrip = processSource(ninjaTop);
  const ninjaBottomStrip = processSource(ninjaBottom);
  const bulldogMoveTopStrip = processSource(bulldogMoveTop);
  const bulldogMoveBottomStrip = processSource(bulldogMoveBottom);
  const bulldogAttackTopStrip = processSource(bulldogAttackTop);
  const bulldogAttackBottomStrip = processSource(bulldogAttackBottom);

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

async function loadTileSprites() {
  const [grass] = await Promise.all([loadSprite("../assets/Grass .png")]);

  if (!grass) return null;
  return { grass };
}

async function loadPowerUpSprites() {
  const [gun, health] = await Promise.all([
    loadSprite("../assets/Gun power up.png"),
    loadSprite("../assets/health power up.png"),
  ]);

  if (!gun && !health) return null;
  return { gun, health };
}

async function loadBossAnimations() {
  const [
    idlePrimary,
    idleRight,
    idleLeft,
    walkCenter,
    walkRightA,
    walkRightB,
    walkLeftA,
    chargeLeftA,
    chargeLeftB,
    swipeLeft,
    swipeRight,
    shootLeft,
    shootRight,
    gunLeft,
    gunRight,
  ] = await Promise.all([
    loadSprite("../assets/Boss Twan .png"),
    loadSprite("../assets/Boss_Enforcer.png"),
    loadSprite("../assets/Boss Twan - facing left.jpg"),
    loadSprite("../assets/Boss Twan - walking.jpg"),
    loadSprite("../assets/Boss Twan walking - right.jpg"),
    loadSprite("../assets/Boss Twan walking -  right (2).jpg"),
    loadSprite("../assets/Boss Twan walking -left.jpg"),
    loadSprite("../assets/Boss Twan - charging left (1).jpg"),
    loadSprite("../assets/Boss Twan - charging left (2).jpg"),
    loadSprite("../assets/Boss Twan punching - left .jpg"),
    loadSprite("../assets/Boss Twan punching - right.jpg"),
    loadSprite("../assets/Boss Twan - shooting left.png"),
    loadSprite("../assets/Boss Twan - shooting right.png"),
    loadSprite("../assets/Boss Twan - with gun.png"),
    loadSprite("../assets/boss Twan - with gun - right.png"),
  ]);

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

async function loadSprite(path) {
  const img = await loadImage(path);
  if (!img) return null;
  return processSprite(img);
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

function processSource(image) {
  if (!image) return null;
  return processSprite(image);
}

function extractFrameSprites(image, frameCount) {
  if (!image) return [];
  return splitSpriteSheet(image, frameCount)
    .map((frame) =>
      processSource(
        cropImage(frame.image, {
          x: frame.sx,
          y: frame.sy,
          w: frame.sw,
          h: frame.sh,
        })
      )
    )
    .filter(Boolean);
}

function extractRowFrameSprites(image, rowCount, rowIndex, frameCount) {
  const rows = splitImageRows(image, rowCount);
  const rowImage = rows[rowIndex];
  return extractFrameSprites(rowImage, frameCount);
}

function normalizeSpriteGroups(groups) {
  let maxWidth = 1;
  let maxHeight = 1;

  Object.values(groups)
    .flat()
    .forEach((sprite) => {
      if (!sprite) return;
      maxWidth = Math.max(maxWidth, sprite.width);
      maxHeight = Math.max(maxHeight, sprite.height);
    });

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
    prime() {
      if (primed) return;
      primed = true;
      clips.forEach((clip) => {
        clip.volume = 0;
        clip.play()
          .then(() => {
            clip.pause();
            clip.currentTime = 0;
          })
          .catch(() => {});
      });
      setTimeout(() => {
        const masterVolume =
          clips[0] && clips[0]._masterVolume !== undefined && clips[0]._masterVolume !== null
            ? clips[0]._masterVolume
            : 0.6;
        clips.forEach((clip) => {
          clip.volume = masterVolume * baseVolume;
        });
      }, 200);
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

function resolveUrl(path) {
  return new URL(encodePath(path), import.meta.url).href;
}

function applyAudioState(music, sfx, state, extraMusic = []) {
  const volume = state.muted ? 0 : state.volume;
  [music, ...extraMusic].filter(Boolean).forEach((track) => {
    track._masterVolume = volume;
    track.volume =
      volume *
      (track.baseVolume !== undefined && track.baseVolume !== null
        ? track.baseVolume
        : 1);
  });
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
    if (sfx) {
      Object.values(sfx).forEach((sound) => {
        if (sound.prime) sound.prime();
      });
    }
    if (audio) {
      audio.volume = 0;
      audio.play()
        .then(() => {
          let fadeVol = 0;
          const targetVol = audio.baseVolume * (audio._masterVolume || 0.6);
          const fadeInterval = setInterval(() => {
            fadeVol += 0.05;
            if (fadeVol >= targetVol) {
              audio.volume = targetVol;
              clearInterval(fadeInterval);
            } else {
              audio.volume = fadeVol;
            }
          }, 50);
        })
        .catch(() => {
          started = false;
        });
    }
  };
  window.addEventListener("keydown", start, { once: true });
  window.addEventListener("pointerdown", start, { once: true });
  window.addEventListener("touchstart", start, { once: true });
}

function setupAudioControls(music, sfx, state, extraMusic = []) {
  if (!music && !sfx) return;
  const clampVolume = (value) => Math.max(0, Math.min(1, value));
  const apply = () => applyAudioState(music, sfx, state, extraMusic);

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
