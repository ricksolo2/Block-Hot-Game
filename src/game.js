import {
  ENTITY_STATES,
  getAnimationClip,
  getAnimationFrame,
  stepAnimation,
} from "./animation.js?v=4";
import { CONFIG, PELLETS } from "./constants.js?v=6";
import {
  clamp,
  rectsOverlap,
  randItem,
  HitStop,
  FloatingText,
} from "./utils.js?v=5";
import {
  Player,
  Enemy,
  Projectile,
  EnemyProjectile,
} from "./entities.js?v=8";
import { ProceduralAnimator } from "./proceduralAnimator.js?v=4";
import { drawHud } from "./ui.js?v=6";

export class Game {
  constructor(canvas, ctx, input, level, options = {}) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.input = input;
    this.levels = options.levels || null;
    this.levelIndex = options.levelIndex || 0;
    const levelData =
      this.levels && this.levels[this.levelIndex]
        ? this.levels[this.levelIndex]
        : { level, background: options.background || null };
    this.level = levelData.level;
    this.camera = { x: 0, y: 0, w: CONFIG.width, h: CONFIG.height };
    this.background = levelData.background || options.background || null;
    this.menuImage = options.menuImage || null;
    this.playerAnimations = options.playerAnimations || null;
    this.spriteScale = options.spriteScale || 1;
    this.enemyAnimations = options.enemyAnimations || null;
    this.enemyScales = options.enemyScales || null;
    this.powerUpSprites = options.powerUpSprites || null;
    this.tileSprites = options.tileSprites || null;
    this.sfx = options.sfx || null;
    this.time = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.particles = [];
    this.hitStop = new HitStop();
    this.floatingText = new FloatingText();
    this.animator = new ProceduralAnimator();
    this.playerVisualState = "idle";
    this.playerDustTimer = 0;

    this.player = new Player(level.playerSpawn.x, level.playerSpawn.y);
    this.checkpoint = { x: level.playerSpawn.x, y: level.playerSpawn.y };

    this.enemies = [];
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.heatPoints = 0;
    this.heatStars = 0;
    this.combo = 1;
    this.comboMaxTime = 2.0;
    this.comboTimer = 0;
    this.score = 0;
    this.coinCount = 0;
    this.swatKills = 0;
    this.safehouseCooldown = 0;
    this.levelComplete = false;
    this.completeStats = null;
    this.copSpawnTimer = CONFIG.copSpawnInterval;
    this.ninjaSpawnTimer = CONFIG.ninjaSpawnInterval;
    this.state = "menu";
    this.pauseTimer = 0;
    this.bust = {
      active: false,
      timer: 0,
      escape: 0,
      dir: 1,
    };

    this.spawnInitialEnemies();
    this.resize();
  }

  start() {
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  loop(now) {
    const delta = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;
    this.accumulator += delta;

    while (this.accumulator >= 1 / 60) {
      this.update(1 / 60);
      this.accumulator -= 1 / 60;
    }

    this.render();
    requestAnimationFrame(this.loop);
  }

  resize() {
    const scale = Math.max(
      1,
      Math.floor(
        Math.min(window.innerWidth / CONFIG.width, window.innerHeight / CONFIG.height)
      )
    );
    this.canvas.style.width = `${CONFIG.width * scale}px`;
    this.canvas.style.height = `${CONFIG.height * scale}px`;
  }

  spawnInitialEnemies() {
    this.enemies = [];
    for (const spawn of this.level.snakeSpawns) {
      this.enemies.push(
        new Enemy("snake", spawn.x, spawn.y, {
          ambush: !!spawn.ambush,
          patrolRange: spawn.patrolRange || 40,
        })
      );
    }
    for (const spawn of this.level.bulldogSpawns) {
      this.enemies.push(this.createBulldog(spawn));
    }
    for (const spawn of this.level.copSpawns) {
      this.enemies.push(this.createCop(spawn));
    }
    for (const spawn of this.level.swatSpawns) {
      this.enemies.push(this.createSwat(spawn));
    }
    for (const spawn of this.level.ninjaSpawns) {
      this.enemies.push(this.createNinja(spawn));
    }
  }

  createCop(spawn) {
    const hp = 2 + Math.floor(this.heatStars / 2);
    return new Enemy("cop", spawn.x, spawn.y, {
      hp,
      patrolRange: spawn.patrolRange || 96,
    });
  }

  createNinja(spawn) {
    const type = spawn.type || "ninja";
    return new Enemy(type, spawn.x, spawn.y, {
      hp: 2,
      patrolRange: spawn.patrolRange || 80,
    });
  }

  createBulldog(spawn) {
    return new Enemy("bulldog", spawn.x, spawn.y, {
      hp: 2,
      patrolRange: spawn.patrolRange || 60,
    });
  }

  createSwat(spawn) {
    return new Enemy("swat", spawn.x, spawn.y, {
      hp: 3,
      patrolRange: spawn.patrolRange || 96,
    });
  }

  update(dt) {
    this.time += dt;
    if (this.shakeTime > 0) {
      this.shakeTime = Math.max(0, this.shakeTime - dt);
      if (this.shakeTime === 0) {
        this.shakeStrength = 0;
        this.shakeDuration = 0;
      }
    }
    if (this.state === "menu") {
      if (this.input.wasPressed("Enter")) {
        this.state = "playing";
      } else if (this.input.wasPressed("KeyI")) {
        this.state = "instructions";
      }
      this.input.clearPressed();
      return;
    }

    if (this.state === "instructions") {
      if (this.input.wasPressed("Escape") || this.input.wasPressed("KeyI")) {
        this.state = "menu";
      } else if (this.input.wasPressed("Enter")) {
        this.state = "playing";
      }
      this.input.clearPressed();
      return;
    }

    if (this.state === "complete") {
      if (this.input.wasPressed("Enter")) {
        if (this.hasNextLevel()) {
          this.advanceLevel();
        } else {
          this.restart();
        }
      } else if (this.input.wasPressed("Escape")) {
        this.returnToMenu();
      }
      this.input.clearPressed();
      return;
    }

    if (this.state === "gameover") {
      if (this.input.wasPressed("Enter")) {
        this.restart();
      } else if (this.input.wasPressed("Escape")) {
        this.returnToMenu();
      }
      this.input.clearPressed();
      return;
    }

    if (this.state === "paused") {
      if (this.input.wasPressed("KeyP") || this.input.wasPressed("Escape")) {
        this.state = "playing";
        this.pauseTimer = 0;
        this.input.clearPressed();
        return;
      }
      this.pauseTimer = Math.max(0, this.pauseTimer - dt);
      if (this.pauseTimer <= 0) {
        this.returnToMenu();
      }
      this.input.clearPressed();
      return;
    }

    this.safehouseCooldown = Math.max(0, this.safehouseCooldown - dt);

    if (this.input.wasPressed("KeyP")) {
      this.state = "paused";
      this.pauseTimer = CONFIG.pauseDuration;
      this.input.clearPressed();
      return;
    }

    if (this.hitStop.update(dt)) {
      this.input.clearPressed();
      return;
    }

    if (this.bust.active) {
      this.updateBust(dt);
      this.player.setState(ENTITY_STATES.STUNNED);
    } else {
      this.storePreviousPosition(this.player);
      this.player.update(dt, this.input, this.level, this);
      this.resolveBarrierCollisions(this.player);
    }
    stepAnimation(this.player, dt, this.playerAnimations);
    this.updatePlayerPresentation(dt);

    for (const barrier of this.level.barriers || []) {
      barrier.flashTimer = Math.max(0, barrier.flashTimer - dt);
    }

    for (const enemy of this.enemies) {
      enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      this.storePreviousPosition(enemy);
      enemy.update(dt, this, this.level);
      this.resolveBarrierCollisions(enemy);
      stepAnimation(enemy, dt, this.getEnemyAnimationSet(enemy));
      this.updateEnemyPresentation(enemy, dt);
    }
    this.enemies = this.enemies.filter((enemy) => !enemy.remove);

    for (const projectile of this.projectiles) {
      projectile.update(dt, this.level);
    }

    this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
    for (const projectile of this.enemyProjectiles) {
      projectile.update(dt, this.level);
    }
    this.enemyProjectiles = this.enemyProjectiles.filter(
      (projectile) => !projectile.dead
    );
    this.updateParticles(dt);
    this.floatingText.update(dt);

    this.handleProjectileHits();
    this.handlePlayerHazards();
    this.handlePlayerEnemyCollision();
    this.handleEnemyProjectiles();
    this.handleCoins();
    this.handlePickups();
    this.handleSafehouses();
    this.handleExit();
    this.updateEnemySpawns(dt);

    if (this.comboTimer > 0) {
      this.comboTimer = Math.max(0, this.comboTimer - dt);
      if (this.comboTimer === 0) {
        this.combo = 1;
      }
    }

    this.updateCamera();
    this.handleOutOfBounds();

    this.input.clearPressed();
  }

  updateCamera() {
    const levelWidth = this.level.width * this.level.tileSize;
    const levelHeight = this.level.height * this.level.tileSize;
    const maxX = Math.max(0, levelWidth - CONFIG.width);
    const maxY = Math.max(0, levelHeight - CONFIG.height);
    const lookAhead = clamp(
      this.player.vx * 0.35,
      -CONFIG.cameraLookAhead,
      CONFIG.cameraLookAhead
    );
    const targetX = clamp(
      this.player.x + this.player.w / 2 + lookAhead - CONFIG.width / 2,
      0,
      maxX
    );
    const targetY = clamp(
      this.player.y + this.player.h / 2 - CONFIG.height / 2,
      0,
      maxY
    );
    this.camera.x += (targetX - this.camera.x) * CONFIG.cameraLerp;
    this.camera.y += (targetY - this.camera.y) * CONFIG.cameraLerp;
  }

  updatePlayerPresentation(dt) {
    this.animator.update(dt);
    this.playerDustTimer = Math.max(0, this.playerDustTimer - dt);
    const previousVisualState = this.playerVisualState;
    this.playerVisualState = this.animator.getState(this.player);

    if (
      this.playerVisualState === "run" &&
      this.player.onGround &&
      this.playerDustTimer <= 0
    ) {
      this.playerDustTimer = 0.05;
      this.spawnParticles(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h,
        {
          color: "#a89070",
          count: 2,
          minSpeed: 10,
          maxSpeed: 32,
          life: 0.18,
          size: 1.5,
        }
      );
    }

    if (this.playerVisualState === "land" && previousVisualState !== "land") {
      this.spawnParticles(
        this.player.x + this.player.w / 2,
        this.player.y + this.player.h,
        {
          color: "#a89070",
          count: 6,
          minSpeed: 20,
          maxSpeed: 55,
          life: 0.16,
          size: 2,
        }
      );
    }
  }

  resetPlayerPresentation() {
    this.playerVisualState = "idle";
    this.playerDustTimer = 0;
  }

  updateEnemyPresentation(enemy, dt) {
    enemy.dustTimer = Math.max(0, (enemy.dustTimer ?? 0) - dt);
    if (enemy.type !== "ninja") return;
    if (!enemy.onGround || Math.abs(enemy.vx) <= 35 || enemy.dustTimer > 0) return;

    enemy.dustTimer = 0.08;
    this.spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h, {
      color: "#8f836f",
      count: 1,
      minSpeed: 8,
      maxSpeed: 24,
      life: 0.14,
      size: 1.2,
    });
  }

  storePreviousPosition(entity) {
    entity.prevX = entity.x;
    entity.prevY = entity.y;
  }

  resolveBarrierCollisions(entity) {
    const barriers = this.level.barriers || [];
    for (const barrier of barriers) {
      if (barrier.broken || !rectsOverlap(entity, barrier)) continue;

      const prevX = entity.prevX ?? entity.x;
      const prevY = entity.prevY ?? entity.y;
      const prevRight = prevX + entity.w;
      const prevBottom = prevY + entity.h;
      const prevLeft = prevX;
      const prevTop = prevY;

      if (prevBottom <= barrier.y) {
        entity.y = barrier.y - entity.h;
        entity.vy = 0;
        entity.onGround = true;
        continue;
      }
      if (prevTop >= barrier.y + barrier.h) {
        entity.y = barrier.y + barrier.h;
        entity.vy = Math.max(0, entity.vy);
        continue;
      }
      if (prevRight <= barrier.x) {
        entity.x = barrier.x - entity.w;
        entity.vx = Math.min(0, entity.vx);
        entity.touchingRight = true;
        continue;
      }
      if (prevLeft >= barrier.x + barrier.w) {
        entity.x = barrier.x + barrier.w;
        entity.vx = Math.max(0, entity.vx);
        entity.touchingLeft = true;
        continue;
      }

      const overlapLeft = entity.x + entity.w - barrier.x;
      const overlapRight = barrier.x + barrier.w - entity.x;
      const overlapTop = entity.y + entity.h - barrier.y;
      const overlapBottom = barrier.y + barrier.h - entity.y;
      const minOverlap = Math.min(
        overlapLeft,
        overlapRight,
        overlapTop,
        overlapBottom
      );

      if (minOverlap === overlapTop) {
        entity.y = barrier.y - entity.h;
        entity.vy = 0;
        entity.onGround = true;
      } else if (minOverlap === overlapBottom) {
        entity.y = barrier.y + barrier.h;
        entity.vy = Math.max(0, entity.vy);
      } else if (minOverlap === overlapLeft) {
        entity.x = barrier.x - entity.w;
        entity.vx = Math.min(0, entity.vx);
        entity.touchingRight = true;
      } else {
        entity.x = barrier.x + barrier.w;
        entity.vx = Math.max(0, entity.vx);
        entity.touchingLeft = true;
      }
    }
  }

  spawnProjectile(player) {
    const pellet = PELLETS[player.pelletIndex];
    const dir = player.facing;
    const x = dir > 0 ? player.x + player.w : player.x - 4;
    const y = player.y + player.h * 0.5;
    const shotPattern =
      player.tripleShotTimer > 0
        ? [
            { offsetY: -3, vy: -80 },
            { offsetY: 0, vy: 0 },
            { offsetY: 3, vy: 80 },
          ]
        : [{ offsetY: 0, vy: 0 }];

    for (const shot of shotPattern) {
      this.projectiles.push(
        new Projectile(x, y + shot.offsetY, pellet.speed * dir, shot.vy, pellet)
      );
    }

    this.addShake(1.2, 0.08);
    this.spawnParticles(x + dir * 4, y, {
      color: pellet.color,
      count: player.tripleShotTimer > 0 ? 10 : 6,
      minSpeed: 30,
      maxSpeed: 90,
      life: 0.25,
    });
    if (this.sfx && this.sfx.gun) {
      this.sfx.gun.play();
    }
  }

  spawnEnemyProjectile(enemy, dir) {
    const speed = 220;
    const x = enemy.x + enemy.w / 2 + dir * (enemy.w / 2 + 2);
    const y = enemy.y + enemy.h * 0.4;
    this.enemyProjectiles.push(new EnemyProjectile(x, y, speed * dir, 0));
    this.spawnParticles(x + dir * 3, y, {
      color: "#ffb08a",
      count: 4,
      minSpeed: 24,
      maxSpeed: 70,
      life: 0.18,
      size: 1.2,
    });
    if (this.sfx && this.sfx.gun) {
      this.sfx.gun.play();
    }
  }

  handleProjectileHits() {
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      const barrier = this.findBarrierHit(projectile);
      if (barrier) {
        this.applyBarrierHit(barrier, projectile);
        continue;
      }
      for (const enemy of this.enemies) {
        if (enemy.remove || enemy.state === ENTITY_STATES.DEAD) continue;
        if (rectsOverlap(projectile, enemy)) {
          this.applyProjectileHit(enemy, projectile);
          if (projectile.dead) break;
        }
      }
    }
  }

  findBarrierHit(projectile) {
    for (const barrier of this.level.barriers || []) {
      if (!barrier.broken && rectsOverlap(projectile, barrier)) {
        return barrier;
      }
    }
    return null;
  }

  applyProjectileHit(enemy, projectile) {
    if (enemy.remove || enemy.state === ENTITY_STATES.DEAD) {
      projectile.dead = true;
      return;
    }

    const pellet = projectile.pellet;
    enemy.hp -= pellet.damage;
    enemy.stunTimer = pellet.stun;
    enemy.vx += Math.sign(projectile.vx) * pellet.push;
    enemy.flashTimer = 0.035;
    this.hitStop.trigger(
      enemy.hp <= 0 ? CONFIG.hitStopDuration : CONFIG.hitStopDuration * 0.55
    );
    this.floatingText.add(
      `-${pellet.damage}`,
      enemy.x + enemy.w / 2,
      enemy.y - 6,
      pellet.color,
      9,
      0.55
    );
    this.spawnParticles(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, {
      color: "#ffffff",
      count: 6,
      minSpeed: 40,
      maxSpeed: 120,
      life: 0.2,
    });

    if (pellet.chain) {
      const target = this.findChainTarget(enemy, 60);
      if (target) {
        target.hp -= 1;
        target.stunTimer = pellet.stun;
        this.floatingText.add(
          "CHAIN!",
          target.x + target.w / 2,
          target.y - 10,
          pellet.color,
          8,
          0.6
        );
        if (target.hp <= 0) {
          this.neutralizeEnemy(target);
        }
      }
    }

    if (enemy.hp <= 0) {
      this.neutralizeEnemy(enemy);
    }

    if (projectile.pierce > 0) {
      projectile.pierce -= 1;
    } else {
      projectile.dead = true;
    }
  }

  applyBarrierHit(barrier, projectile) {
    barrier.flashTimer = 0.08;
    this.addShake(0.8, 0.06);
    this.spawnParticles(projectile.x, projectile.y, {
      color: "#ffe26a",
      count: 5,
      minSpeed: 35,
      maxSpeed: 95,
      life: 0.18,
    });

    const required = (barrier.requiresPellet || "Red").toLowerCase();
    const pelletName = (projectile.pellet.name || "").toLowerCase();
    if (pelletName === required) {
      barrier.hp -= projectile.pellet.damage;
      if (barrier.hp <= 0) {
        barrier.hp = 0;
        barrier.broken = true;
        this.hitStop.trigger(CONFIG.hitStopDuration);
        this.floatingText.add(
          "BREAK!",
          barrier.x + barrier.w / 2,
          barrier.y - 8,
          "#ffe277",
          10,
          0.7
        );
        this.addShake(2.4, 0.14);
        this.spawnParticles(
          barrier.x + barrier.w / 2,
          barrier.y + barrier.h / 2,
          {
            color: "#ffdf5a",
            count: 18,
            minSpeed: 40,
            maxSpeed: 170,
            life: 0.35,
          }
        );
      }
    }

    projectile.dead = true;
  }

  findChainTarget(origin, radius) {
    let best = null;
    let bestDist = Infinity;

    for (const enemy of this.enemies) {
      if (
        enemy === origin ||
        enemy.hp <= 0 ||
        enemy.remove ||
        enemy.state === ENTITY_STATES.DEAD
      ) {
        continue;
      }
      const dx = enemy.x - origin.x;
      const dy = enemy.y - origin.y;
      const dist = Math.hypot(dx, dy);
      if (dist < radius && dist < bestDist) {
        best = enemy;
        bestDist = dist;
      }
    }

    return best;
  }

  neutralizeEnemy(enemy) {
    if (!enemy || enemy.state === ENTITY_STATES.DEAD) return;

    if (enemy.type === "cop" || enemy.type === "swat") {
      this.addHeatStars(1);
    }
    if (enemy.type === "swat") {
      this.swatKills += 1;
    }

    this.addCombo();
    const points = 100 * this.combo;
    this.score += points;
    this.floatingText.add(
      `+${points}`,
      enemy.x + enemy.w / 2,
      enemy.y - 14,
      "#f7f1cf",
      10,
      0.9
    );
    enemy.markDead();
  }

  handlePlayerHazards() {
    if (this.bust.active || this.player.invuln > 0) return;
    const tiles = this.level.tilesInRect(this.player);
    for (const tile of tiles) {
      if (this.level.isHazardTile(tile.type)) {
        this.damagePlayer(1, this.player.vx >= 0 ? -1 : 1);
        break;
      }
    }
  }

  handlePlayerEnemyCollision() {
    if (this.bust.active || this.player.invuln > 0) return;
    for (const enemy of this.enemies) {
      if (enemy.remove || enemy.state === ENTITY_STATES.DEAD) continue;
      if (rectsOverlap(this.player, enemy)) {
        if (enemy.type === "cop") {
          this.startBust(enemy);
        } else {
          const dir = this.player.x < enemy.x ? -1 : 1;
          if (enemy.type === "snake" && this.sfx && this.sfx.snake) {
            this.sfx.snake.play();
          }
          if (enemy.type === "bulldog" && this.sfx && this.sfx.bulldog) {
            this.sfx.bulldog.play();
          }
          this.damagePlayer(1, dir);
        }
        break;
      }
    }
  }

  handleEnemyProjectiles() {
    if (this.bust.active || this.player.invuln > 0) return;
    for (const projectile of this.enemyProjectiles) {
      if (projectile.dead) continue;
      if (rectsOverlap(this.player, projectile)) {
        const dir = projectile.vx < 0 ? -1 : 1;
        this.hitStop.trigger(CONFIG.hitStopDuration * 0.65);
        this.damagePlayer(projectile.damage, dir);
        projectile.dead = true;
        break;
      }
    }
  }

  startBust(enemy) {
    if (this.bust.active || this.player.invuln > 0) return;
    this.bust.active = true;
    this.bust.timer = CONFIG.bustHoldTime;
    this.bust.escape = 0;
    this.bust.dir = this.player.x < enemy.x ? -1 : 1;
    this.player.vx = 0;
    this.player.vy = 0;
    if (this.sfx && this.sfx.siren) {
      this.sfx.siren.play();
    }
    if (this.sfx && this.sfx.bust) {
      this.sfx.bust.play();
    }
  }

  updateBust(dt) {
    this.player.vx = 0;
    this.player.vy = 0;
    this.bust.timer -= dt;

    if (
      this.input.wasPressed("ArrowLeft") ||
      this.input.wasPressed("ArrowRight") ||
      this.input.wasPressed("KeyZ") ||
      this.input.wasPressed("Space") ||
      this.input.wasPressed("KeyX")
    ) {
      this.bust.escape += 1;
    }

    if (this.bust.escape >= CONFIG.bustEscapeSteps) {
      this.endBust(true);
    } else if (this.bust.timer <= 0) {
      this.endBust(false);
    }
  }

  endBust(escaped) {
    this.bust.active = false;
    if (escaped) {
      this.player.invuln = 0.8;
      this.player.vx = -this.bust.dir * 140;
      this.player.vy = -180;
    } else {
      this.player.hp -= 1;
      if (this.player.hp <= 0) {
        this.triggerGameOver();
      } else {
        this.respawnAtCheckpoint({ heal: false, reduceHeat: true });
      }
    }
  }

  handleCoins() {
    for (const coin of this.level.coins) {
      if (coin.collected) continue;
      const dx = this.player.x + this.player.w / 2 - coin.x;
      const dy = this.player.y + this.player.h / 2 - coin.y;
      if (Math.hypot(dx, dy) < coin.r + 10) {
        coin.collected = true;
        this.coinCount += 1;
        this.score += 10 * this.combo;
        this.addCombo();
        if (this.sfx && this.sfx.coin) {
          this.sfx.coin.play();
        }
      }
    }
  }

  handlePickups() {
    for (const pickup of this.level.pickups || []) {
      if (pickup.collected) continue;

      const dx = this.player.x + this.player.w / 2 - pickup.x;
      const dy = this.player.y + this.player.h / 2 - pickup.y;
      if (Math.hypot(dx, dy) > 18) continue;

      if (pickup.type === "health") {
        if (this.player.hp >= this.player.maxHp) {
          continue;
        }
        pickup.collected = true;
        this.player.hp = Math.min(
          this.player.maxHp,
          this.player.hp + CONFIG.healthPickupHeal
        );
        this.floatingText.add(
          `+${CONFIG.healthPickupHeal} HP`,
          pickup.x,
          pickup.y - 10,
          "#86ff8a",
          10,
          0.8
        );
        this.spawnParticles(pickup.x, pickup.y, {
          color: "#86ff8a",
          count: 10,
          minSpeed: 16,
          maxSpeed: 60,
          life: 0.28,
          size: 1.8,
        });
        continue;
      }

      if (pickup.type === "gun") {
        pickup.collected = true;
        this.player.tripleShotTimer = Math.max(
          this.player.tripleShotTimer,
          CONFIG.tripleShotDuration
        );
        this.floatingText.add(
          "TRIPLE SHOT",
          pickup.x,
          pickup.y - 10,
          "#d184ff",
          10,
          0.9
        );
        this.spawnParticles(pickup.x, pickup.y, {
          color: "#d184ff",
          count: 12,
          minSpeed: 18,
          maxSpeed: 72,
          life: 0.32,
          size: 1.8,
        });
      }
    }
  }

  handleSafehouses() {
    if (this.safehouseCooldown > 0) return;
    for (const safehouse of this.level.safehouses) {
      if (rectsOverlap(this.player, safehouse)) {
        this.safehouseCooldown = 2;
        this.checkpoint.x = safehouse.x;
        this.checkpoint.y = safehouse.y;
        this.player.hp = this.player.maxHp;
        this.reduceHeatStars(1);
        this.floatingText.add(
          "SAFEHOUSE",
          safehouse.x + safehouse.w / 2,
          safehouse.y - 10,
          "#70f4ff",
          10,
          0.8
        );
        break;
      }
    }
  }

  handleExit() {
    const requiredCoins =
      this.level.minCoinsToExit ?? CONFIG.minCoinsToExit;
    const requiredSwatKills = this.level.requiredSwatKills || 0;
    if (
      rectsOverlap(this.player, this.level.exit) &&
      this.coinCount >= requiredCoins &&
      this.swatKills >= requiredSwatKills
    ) {
      this.levelComplete = true;
      this.state = "complete";
      this.completeStats = {
        coins: this.coinCount,
        swatKills: this.swatKills,
        requiredSwatKills,
        score: this.score,
        level: this.levelIndex + 1,
      };
      this.stopMusic();
    }
  }

  handleOutOfBounds() {
    const levelBottom = this.level.height * this.level.tileSize + 40;
    if (this.player.y > levelBottom) {
      this.applyFallPenalty();
    }
  }

  updateEnemySpawns(dt) {
    const activeCops = this.enemies.filter(
      (enemy) =>
        !enemy.remove &&
        enemy.state !== ENTITY_STATES.DEAD &&
        (enemy.type === "cop" || enemy.type === "swat")
    ).length;
    const activeNinjas = this.enemies.filter(
      (enemy) =>
        !enemy.remove &&
        enemy.state !== ENTITY_STATES.DEAD &&
        (
          enemy.type === "ninja" ||
          enemy.type === "redNinja" ||
          enemy.type === "blueNinja"
        )
    ).length;

    const targetCops = clamp(1 + this.heatStars, 1, 5);
    const targetNinjas = clamp(2 + Math.floor(this.heatStars / 2), 2, 5);

    this.copSpawnTimer -= dt;
    if (this.copSpawnTimer <= 0) {
      if (activeCops < targetCops) {
        const spawn = randItem(this.level.copSpawns);
        if (spawn) {
          this.enemies.push(this.createCop(spawn));
        }
      }
      this.copSpawnTimer = CONFIG.copSpawnInterval;
    }

    this.ninjaSpawnTimer -= dt;
    if (this.ninjaSpawnTimer <= 0) {
      if (activeNinjas < targetNinjas) {
        const spawn = randItem(this.level.ninjaSpawns);
        if (spawn) {
          this.enemies.push(this.createNinja(spawn));
        }
      }
      this.ninjaSpawnTimer = CONFIG.ninjaSpawnInterval;
    }
  }

  addHeat(amount) {
    this.heatPoints += amount;
    this.updateHeatStars();
  }

  addHeatStars(count) {
    this.setHeatStars(this.heatStars + count);
  }

  reduceHeatStars(count) {
    this.setHeatStars(this.heatStars - count);
  }

  updateHeatStars() {
    let stars = 0;
    for (const threshold of CONFIG.heatThresholds) {
      if (this.heatPoints >= threshold) {
        stars += 1;
      }
    }
    this.heatStars = Math.min(CONFIG.maxHeatStars, stars);
  }

  setHeatStars(stars) {
    this.heatStars = clamp(stars, 0, CONFIG.maxHeatStars);
    if (this.heatStars === 0) {
      this.heatPoints = 0;
    } else {
      const threshold = CONFIG.heatThresholds[this.heatStars - 1] || 0;
      this.heatPoints = threshold;
    }
  }

  addCombo() {
    this.combo = Math.min(10, this.combo + 1);
    this.comboTimer = this.comboMaxTime;
  }

  damagePlayer(amount, knockbackDir) {
    this.player.hp -= amount;
    this.player.invuln = 1.0;
    this.player.hurtTimer = 0.36;
    this.player.hitAnimTimer = 0.15;
    this.player.vx = 160 * knockbackDir;
    this.player.vy = -200;
    this.hitStop.trigger(CONFIG.hitStopDuration);
    this.floatingText.add(
      `-${amount}`,
      this.player.x + this.player.w / 2,
      this.player.y - 8,
      "#ff9f9f",
      10,
      0.6
    );
    this.combo = 1;
    this.comboTimer = 0;
    this.addShake(2, 0.12);
    this.spawnParticles(
      this.player.x + this.player.w / 2,
      this.player.y + this.player.h / 2,
      {
        color: "#ffb3b3",
        count: 10,
        minSpeed: 50,
        maxSpeed: 160,
        life: 0.35,
      }
    );

    if (this.player.hp <= 0) {
      this.triggerGameOver();
    }
  }

  respawnAtCheckpoint({ heal = false, reduceHeat = true } = {}) {
    this.player.x = this.checkpoint.x;
    this.player.y = this.checkpoint.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hurtTimer = 0;
    this.player.hitAnimTimer = 0;
    this.player.landTimer = 0;
    if (heal) {
      this.player.hp = this.player.maxHp;
    }
    this.player.invuln = 1.0;
    this.player.ammo = this.player.maxAmmo;
    this.player.reloadTimer = 0;
    this.resetPlayerPresentation();
    if (reduceHeat) {
      this.reduceHeatStars(1);
    }
  }

  respawnAtStart({ reduceHeat = true } = {}) {
    this.player.x = this.level.playerSpawn.x;
    this.player.y = this.level.playerSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.hurtTimer = 0;
    this.player.hitAnimTimer = 0;
    this.player.landTimer = 0;
    this.player.invuln = 1.0;
    this.player.ammo = this.player.maxAmmo;
    this.player.reloadTimer = 0;
    this.resetPlayerPresentation();
    if (reduceHeat) {
      this.reduceHeatStars(1);
    }
  }

  applyFallPenalty() {
    this.player.hp -= 1;
    if (this.player.hp <= 0) {
      this.triggerGameOver();
    } else {
      this.respawnAtStart({ reduceHeat: true });
    }
    if (this.sfx && this.sfx.fall) {
      this.sfx.fall.play();
    }
  }

  hasNextLevel() {
    return this.levels && this.levelIndex < this.levels.length - 1;
  }

  setLevelIndex(index) {
    if (!this.levels || !this.levels[index]) return;
    const levelData = this.levels[index];
    this.levelIndex = index;
    this.level = levelData.level;
    this.background = levelData.background || this.background;
  }

  advanceLevel() {
    if (!this.hasNextLevel()) {
      this.restart();
      return;
    }
    this.setLevelIndex(this.levelIndex + 1);
    this.restart();
  }

  restart() {
    this.levelComplete = false;
    this.state = "playing";
    this.pauseTimer = 0;
    this.completeStats = null;
    this.score = 0;
    this.coinCount = 0;
    this.swatKills = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.heatPoints = 0;
    this.updateHeatStars();
    this.safehouseCooldown = 0;
    this.copSpawnTimer = CONFIG.copSpawnInterval;
    this.ninjaSpawnTimer = CONFIG.ninjaSpawnInterval;
    this.bust.active = false;
    this.bust.timer = 0;
    this.bust.escape = 0;
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.particles = [];
    this.hitStop.reset();
    this.floatingText.clear();

    for (const coin of this.level.coins) {
      coin.collected = false;
    }
    for (const pickup of this.level.pickups || []) {
      pickup.collected = false;
    }
    for (const barrier of this.level.barriers || []) {
      barrier.hp = barrier.maxHp;
      barrier.broken = false;
      barrier.flashTimer = 0;
    }

    this.player.reset(this.level.playerSpawn.x, this.level.playerSpawn.y);
    this.resetPlayerPresentation();
    this.checkpoint.x = this.level.playerSpawn.x;
    this.checkpoint.y = this.level.playerSpawn.y;
    this.spawnInitialEnemies();
    this.resumeMusic();
  }

  returnToMenu() {
    if (this.levels && this.levelIndex !== 0) {
      this.setLevelIndex(0);
    }
    this.restart();
    this.state = "menu";
  }

  stopMusic() {
    if (this.music && !this.music.paused) {
      this.music.pause();
      this.music.currentTime = 0;
    }
  }

  resumeMusic() {
    if (this.music && this.music.paused) {
      this.music.play().catch(() => {});
    }
  }

  triggerGameOver() {
    this.state = "gameover";
    this.levelComplete = false;
    this.bust.active = false;
    this.pauseTimer = 0;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invuln = 0;
    this.player.hurtTimer = 0;
    this.player.setState(ENTITY_STATES.DEAD);
    this.stopMusic();
    if (this.sfx && this.sfx.death) {
      this.sfx.death.play();
    }
  }

  isPlayerInGrass() {
    return this.level.isInGrass(this.player);
  }

  getNearbyBarrier() {
    for (const barrier of this.level.barriers || []) {
      if (barrier.broken) continue;
      const dx =
        barrier.x + barrier.w / 2 - (this.player.x + this.player.w / 2);
      const dy =
        barrier.y + barrier.h / 2 - (this.player.y + this.player.h / 2);
      if (Math.abs(dx) < 72 && Math.abs(dy) < 56) {
        return barrier;
      }
    }
    return null;
  }

  getExitCoinShortage() {
    const required = this.level.minCoinsToExit ?? CONFIG.minCoinsToExit;
    if (!rectsOverlap(this.player, this.level.exit) || this.coinCount >= required) {
      return 0;
    }
    return required - this.coinCount;
  }

  getExitSwatShortage() {
    const required = this.level.requiredSwatKills || 0;
    if (!required) return 0;
    if (!rectsOverlap(this.player, this.level.exit) || this.swatKills >= required) {
      return 0;
    }
    return required - this.swatKills;
  }

  isExitReady() {
    const requiredCoins = this.level.minCoinsToExit ?? CONFIG.minCoinsToExit;
    const requiredSwatKills = this.level.requiredSwatKills || 0;
    return this.coinCount >= requiredCoins && this.swatKills >= requiredSwatKills;
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CONFIG.width, CONFIG.height);

    const shake = this.getShakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);
    this.drawBackground(ctx);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    this.level.draw(ctx, this.camera, this.tileSprites);
    this.drawBarriers(ctx);
    this.drawCoins(ctx);
    this.drawPickups(ctx);
    this.drawSafehouses(ctx);
    this.drawExit(ctx);
    this.drawProjectiles(ctx);
    this.drawEnemyProjectiles(ctx);
    this.drawParticles(ctx);
    this.drawEnemies(ctx);
    this.drawPlayer(ctx);
    this.floatingText.draw(ctx);

    ctx.restore();
    ctx.restore();
    if (this.bust.active) {
      this.drawBustLights(ctx);
    }
    drawHud(ctx, this);
  }

  drawBackground(ctx) {
    if (!this.background) {
      ctx.fillStyle = "#151515";
      ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
      return;
    }

    ctx.fillStyle = "#0c0c0c";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    const scale = Math.min(
      CONFIG.width / this.background.width,
      CONFIG.height / this.background.height
    );
    const drawW = this.background.width * scale;
    const drawH = this.background.height * scale;
    const drawX = (CONFIG.width - drawW) / 2;
    const drawY = (CONFIG.height - drawH) / 2;

    ctx.drawImage(this.background, drawX, drawY, drawW, drawH);
    ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  drawBustLights(ctx) {
    const pulse = (Math.sin(this.time * 12) + 1) / 2;
    const leftAlpha = 0.18 + 0.15 * pulse;
    const rightAlpha = 0.18 + 0.15 * (1 - pulse);
    ctx.save();
    ctx.fillStyle = `rgba(255, 60, 60, ${leftAlpha})`;
    ctx.fillRect(0, 0, CONFIG.width / 2, CONFIG.height);
    ctx.fillStyle = `rgba(60, 140, 255, ${rightAlpha})`;
    ctx.fillRect(CONFIG.width / 2, 0, CONFIG.width / 2, CONFIG.height);
    ctx.restore();
  }

  drawCoins(ctx) {
    for (const coin of this.level.coins) {
      if (coin.collected) continue;
      const hover = Math.sin(this.time * 6 + coin.x * 0.1) * 0.6;
      const drawY = coin.y + hover;
      ctx.fillStyle = "#0b0b0b";
      ctx.beginPath();
      ctx.arc(coin.x, drawY, coin.r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f2d64b";
      ctx.beginPath();
      ctx.arc(coin.x, drawY, coin.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSafehouses(ctx) {
    ctx.fillStyle = "#4bd1b8";
    for (const safehouse of this.level.safehouses) {
      ctx.fillRect(safehouse.x, safehouse.y, safehouse.w, safehouse.h);
    }
  }

  drawPickups(ctx) {
    for (const pickup of this.level.pickups || []) {
      if (pickup.collected) continue;
      const sprite = this.powerUpSprites?.[pickup.type] || null;
      const hover = Math.sin(this.time * 6 + pickup.x * 0.1) * 2.2;
      const pulse = (Math.sin(this.time * 7 + pickup.x * 0.06) + 1) * 0.5;
      const drawX = pickup.x;
      const drawY = pickup.y + hover;
      const glowColor = pickup.type === "gun" ? "#d184ff" : "#86ff8a";

      ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
      ctx.beginPath();
      ctx.ellipse(drawX, pickup.y + 10, 10 + pulse * 2, 3 + pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = glowColor;
      ctx.globalAlpha = 0.18 + pulse * 0.18;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 11 + pulse * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.28 + pulse * 0.14;
      ctx.beginPath();
      ctx.arc(drawX, drawY, 7 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (sprite) {
        const drawH = 24;
        const drawW = Math.max(10, Math.round((sprite.width / sprite.height) * drawH));
        ctx.drawImage(
          sprite,
          Math.round(drawX - drawW / 2),
          Math.round(drawY - drawH / 2),
          drawW,
          drawH
        );
      } else {
        ctx.fillStyle = glowColor;
        ctx.fillRect(drawX - 6, drawY - 10, 12, 20);
      }
    }
  }

  drawBarriers(ctx) {
    for (const barrier of this.level.barriers || []) {
      if (barrier.broken) continue;

      const x = barrier.x;
      const y = barrier.y;
      const w = barrier.w;
      const h = barrier.h;
      const flashAlpha = barrier.flashTimer > 0 ? 0.35 : 0;
      const damageRatio = barrier.maxHp > 0 ? barrier.hp / barrier.maxHp : 1;
      const tapeY = y + h * 0.3;
      const postW = Math.max(6, Math.round(w * 0.08));
      const baseH = Math.max(8, Math.round(h * 0.45));

      ctx.fillStyle = "#4d101a";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 2, w * 0.58, baseH * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#8d5a35";
      ctx.fillRect(x + 6, y + 2, postW, h - 6);
      ctx.fillRect(x + w - postW - 6, y + 2, postW, h - 6);

      ctx.fillStyle = "#6f3d26";
      ctx.fillRect(x + 8, y + 4, 2, h - 10);
      ctx.fillRect(x + w - postW - 4, y + 4, 2, h - 10);

      ctx.fillStyle = damageRatio < 0.5 ? "#f5d84d" : "#f0d02a";
      ctx.fillRect(x + postW + 8, tapeY, w - postW * 2 - 16, 8);

      ctx.fillStyle = "#161616";
      const tapeStart = x + postW + 8;
      const tapeWidth = w - postW * 2 - 16;
      for (let stripe = -4; stripe < tapeWidth + 8; stripe += 18) {
        ctx.beginPath();
        ctx.moveTo(tapeStart + stripe, tapeY + 8);
        ctx.lineTo(tapeStart + stripe + 8, tapeY + 8);
        ctx.lineTo(tapeStart + stripe + 16, tapeY);
        ctx.lineTo(tapeStart + stripe + 8, tapeY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.font = "7px monospace";
      ctx.fillStyle = "#111111";
      const label = "POLICE";
      const labelWidth = ctx.measureText(label).width;
      const segmentCount = Math.max(1, Math.floor(tapeWidth / 42));
      for (let i = 0; i < segmentCount; i += 1) {
        const labelX = tapeStart + 8 + i * (tapeWidth / segmentCount);
        ctx.fillText(label, labelX, tapeY + 1);
      }

      if (flashAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
        ctx.fillRect(x, y, w, h);
      }
    }
  }

  drawExit(ctx) {
    const ready = this.isExitReady();
    ctx.fillStyle = ready ? "#4bd97f" : "#d94b4b";
    ctx.fillRect(this.level.exit.x, this.level.exit.y, this.level.exit.w, this.level.exit.h);
    ctx.strokeStyle = ready ? "#c1ffd4" : "#f7b2b2";
    ctx.strokeRect(this.level.exit.x, this.level.exit.y, this.level.exit.w, this.level.exit.h);
  }

  drawProjectiles(ctx) {
    for (const projectile of this.projectiles) {
      ctx.fillStyle = projectile.pellet.color;
      ctx.fillRect(projectile.x, projectile.y, projectile.w, projectile.h);
    }
  }

  drawEnemyProjectiles(ctx) {
    ctx.fillStyle = "#ff8a8a";
    for (const projectile of this.enemyProjectiles) {
      ctx.fillRect(projectile.x, projectile.y, projectile.w, projectile.h);
    }
  }

  drawParticles(ctx) {
    for (const particle of this.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(
        particle.x - particle.size / 2,
        particle.y - particle.size / 2,
        particle.size,
        particle.size
      );
    }
    ctx.globalAlpha = 1;
  }

  drawEnemies(ctx) {
    for (const enemy of this.enemies) {
      const presentation = this.getEnemyAnimationPresentation(enemy);
      if (presentation && presentation.frame) {
        this.drawEnemyFrame(
          ctx,
          enemy,
          presentation.frame,
          presentation.flip,
          enemy.flashTimer > 0
        );
        continue;
      }

      const flash = enemy.flashTimer > 0;
      if (enemy.type === "cop" || enemy.type === "swat") {
        ctx.fillStyle = flash ? "#ffffff" : "#3d6fd9";
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      } else if (enemy.type === "ninja") {
        ctx.fillStyle = flash ? "#ffffff" : "#141414";
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      } else if (enemy.type === "redNinja") {
        ctx.fillStyle = flash ? "#ffffff" : "#d94b4b";
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      } else if (enemy.type === "blueNinja") {
        ctx.fillStyle = flash ? "#ffffff" : "#4b8bff";
        ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
      } else if (enemy.type === "bulldog") {
        if (flash) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(enemy.x - 1, enemy.y - 1, enemy.w + 2, enemy.h + 2);
        } else {
          ctx.fillStyle = "#4b2f1f";
          ctx.fillRect(enemy.x - 1, enemy.y - 1, enemy.w + 2, enemy.h + 2);
          ctx.fillStyle = "#8b5a3c";
          ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
        }
      } else {
        if (flash) {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(enemy.x - 1, enemy.y - 1, enemy.w + 2, enemy.h + 2);
        } else {
          ctx.fillStyle = "#0b0b0b";
          ctx.fillRect(enemy.x - 1, enemy.y - 1, enemy.w + 2, enemy.h + 2);
          ctx.fillStyle = "#f5f5f5";
          ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
        }
      }
    }
  }

  drawPlayer(ctx) {
    const visualState = this.playerVisualState || this.animator.getState(this.player);
    const transform = this.animator.getTransform(this.player, visualState);
    const flash = this.player.hurtTimer > 0 && Math.floor(this.time * 24) % 2 === 0;
    const clip = getAnimationClip(this.player, this.playerAnimations);
    const frame = getAnimationFrame(this.player, this.playerAnimations);
    if (!frame || !frame.image) {
      const centerX = this.player.x + this.player.w / 2 + (transform.offsetX || 0);
      const centerY = this.player.y + this.player.h / 2 + (transform.offsetY || 0);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(transform.rotation || 0);
      ctx.scale(transform.scaleX || 1, transform.scaleY || 1);
      ctx.fillStyle = this.player.invuln > 0 ? "#9ef5a1" : "#5ad96b";
      ctx.fillRect(-this.player.w / 2, -this.player.h / 2, this.player.w, this.player.h);
      ctx.restore();
      return;
    }

    const scale = this.spriteScale || 1;
    const drawW = frame.sw * scale;
    const drawH = frame.sh * scale;
    const drawX = this.player.x + this.player.w / 2 - drawW / 2;
    const drawY = this.player.y + this.player.h - drawH;
    const centerX = drawX + drawW / 2 + (transform.offsetX || 0);
    const centerY = drawY + drawH / 2 + (transform.offsetY || 0);
    const sourceFacing = clip?.facing || 1;
    const flip = sourceFacing !== this.player.facing;

    if (visualState === "dash") {
      this.drawTransformedAnimationFrame(
        ctx,
        frame,
        centerX - this.player.facing * 8,
        centerY,
        drawW,
        drawH,
        flip,
        transform,
        false,
        0.3
      );
      this.drawTransformedAnimationFrame(
        ctx,
        frame,
        centerX - this.player.facing * 16,
        centerY,
        drawW,
        drawH,
        flip,
        transform,
        false,
        0.15
      );
    }

    this.drawTransformedAnimationFrame(
      ctx,
      frame,
      centerX,
      centerY,
      drawW,
      drawH,
      flip,
      transform,
      flash
    );
  }

  getEnemyAnimationSet(enemy) {
    if (!this.enemyAnimations) return null;
    const set = this.enemyAnimations[enemy.type];
    if (!set) return null;

    if (enemy.type === "swat" && enemy.state === ENTITY_STATES.ATTACK) {
      return {
        ...set,
        [ENTITY_STATES.ATTACK]:
          enemy.facing < 0
            ? set.attackLeft || set[ENTITY_STATES.ATTACK]
            : set.attackRight || set[ENTITY_STATES.ATTACK],
      };
    }

    return set;
  }

  getEnemyAnimationPresentation(enemy) {
    const animationSet = this.getEnemyAnimationSet(enemy);
    const frame = getAnimationFrame(enemy, animationSet);
    if (!frame) return null;
    const flip =
      enemy.type === "swat" && enemy.state === ENTITY_STATES.ATTACK
        ? false
        : (enemy.facing || (enemy.vx < 0 ? -1 : 1)) < 0;
    return { frame, flip };
  }

  drawEnemyFrame(ctx, enemy, frame, flip, flash) {
    const scale = (this.enemyScales && this.enemyScales[enemy.type]) || 1;
    const drawW = frame.sw * scale;
    const drawH = frame.sh * scale;
    const drawX = enemy.x + enemy.w / 2 - drawW / 2;
    const baseOffset =
      enemy.type === "snake" || enemy.type === "bulldog" ? -2 : 0;
    const drawY = enemy.y + enemy.h - drawH + baseOffset;
    const transform = this.animator.getEnemyTransform(
      enemy,
      this.player.x + this.player.w / 2
    );
    const centerX = drawX + drawW / 2 + (transform.offsetX || 0);
    const centerY = drawY + drawH / 2 + (transform.offsetY || 0);
    const shadowScale = Math.max(0, (transform.scaleX + transform.scaleY) * 0.5);

    if (enemy.type === "snake" || enemy.type === "bulldog") {
      ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * shadowScale})`;
      ctx.fillRect(
        drawX + drawW * (0.5 - 0.3 * shadowScale),
        enemy.y + enemy.h - 2,
        drawW * 0.6 * shadowScale,
        3
      );
    }

    this.drawTransformedAnimationFrame(
      ctx,
      frame,
      centerX,
      centerY,
      drawW,
      drawH,
      flip,
      transform,
      flash
    );
  }

  drawAnimationFrame(ctx, frame, drawX, drawY, drawW, drawH, flip, flash) {
    if (!frame || !frame.image) return;

    if (flip) {
      ctx.save();
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(
        frame.image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        0,
        0,
        drawW,
        drawH
      );
      if (flash) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(0, 0, drawW, drawH);
      }
      ctx.restore();
      return;
    }

    ctx.drawImage(
      frame.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      drawX,
      drawY,
      drawW,
      drawH
    );
    if (flash) {
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(drawX, drawY, drawW, drawH);
      ctx.restore();
    }
  }

  drawTransformedAnimationFrame(
    ctx,
    frame,
    anchorX,
    anchorY,
    drawW,
    drawH,
    flip,
    transform,
    flash,
    alpha = 1
  ) {
    if (!frame || !frame.image) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(anchorX, anchorY);
    ctx.rotate(transform.rotation || 0);
    ctx.scale((flip ? -1 : 1) * (transform.scaleX || 1), transform.scaleY || 1);
    ctx.drawImage(
      frame.image,
      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,
      -drawW / 2,
      -drawH / 2,
      drawW,
      drawH
    );
    if (flash) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.fillRect(-drawW / 2, -drawH / 2, drawW, drawH);
    }
    ctx.restore();
  }

  addShake(strength, duration) {
    this.shakeStrength = Math.max(this.shakeStrength, strength);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = Math.max(this.shakeTime, duration);
  }

  getShakeOffset() {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };
    const t = this.shakeDuration > 0 ? this.shakeTime / this.shakeDuration : 1;
    const strength = this.shakeStrength * t;
    return {
      x: (Math.random() * 2 - 1) * strength,
      y: (Math.random() * 2 - 1) * strength,
    };
  }

  spawnParticles(x, y, options = {}) {
    const count = options.count ?? 6;
    const color = options.color ?? "#ffffff";
    const minSpeed = options.minSpeed ?? 40;
    const maxSpeed = options.maxSpeed ?? 120;
    const life = options.life ?? 0.3;
    const size = options.size ?? 2;

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        size: size + Math.random(),
        color,
      });
    }
  }

  updateParticles(dt) {
    const gravity = 280;
    this.particles = this.particles.filter((particle) => {
      particle.life -= dt;
      if (particle.life <= 0) {
        return false;
      }
      particle.vy += gravity * dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      return true;
    });
  }
}
