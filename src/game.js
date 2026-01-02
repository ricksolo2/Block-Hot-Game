import { CONFIG, PELLETS } from "./constants.js";
import { clamp, rectsOverlap, randItem } from "./utils.js";
import { Player, Enemy, Projectile, EnemyProjectile } from "./entities.js";
import { drawHud } from "./ui.js";

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
    this.sprites = options.sprites || null;
    this.spriteScale = options.spriteScale || 1;
    this.enemySprites = options.enemySprites || null;
    this.enemyScales = options.enemyScales || null;
    this.tileSprites = options.tileSprites || null;
    this.sfx = options.sfx || null;
    this.time = 0;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeStrength = 0;
    this.particles = [];

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

    if (this.bust.active) {
      this.updateBust(dt);
    } else {
      this.player.update(dt, this.input, this.level, this);
    }

    for (const enemy of this.enemies) {
      enemy.flashTimer = Math.max(0, enemy.flashTimer - dt);
      enemy.update(dt, this, this.level);
    }

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

    this.handleProjectileHits();
    this.handlePlayerHazards();
    this.handlePlayerEnemyCollision();
    this.handleEnemyProjectiles();
    this.handleCoins();
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

  spawnProjectile(player) {
    const pellet = PELLETS[player.pelletIndex];
    const dir = player.facing;
    const x = dir > 0 ? player.x + player.w : player.x - 4;
    const y = player.y + player.h * 0.5;
    this.projectiles.push(
      new Projectile(x, y, pellet.speed * dir, 0, pellet)
    );
    this.addShake(1.2, 0.08);
    this.spawnParticles(x + dir * 4, y, {
      color: pellet.color,
      count: 6,
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
  }

  handleProjectileHits() {
    for (const projectile of this.projectiles) {
      if (projectile.dead) continue;
      for (const enemy of this.enemies) {
        if (rectsOverlap(projectile, enemy)) {
          this.applyProjectileHit(enemy, projectile);
          if (projectile.dead) break;
        }
      }
    }

    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  applyProjectileHit(enemy, projectile) {
    const pellet = projectile.pellet;
    enemy.hp -= pellet.damage;
    enemy.stunTimer = pellet.stun;
    enemy.vx += Math.sign(projectile.vx) * pellet.push;
    enemy.flashTimer = 0.035;
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

  findChainTarget(origin, radius) {
    let best = null;
    let bestDist = Infinity;

    for (const enemy of this.enemies) {
      if (enemy === origin || enemy.hp <= 0) continue;
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
    if (enemy.type === "cop" || enemy.type === "swat") {
      this.addHeatStars(1);
    }

    this.addCombo();
    this.score += 100 * this.combo;
    enemy.hp = 0;
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
      if (rectsOverlap(this.player, enemy)) {
        if (enemy.type === "cop") {
          this.startBust(enemy);
        } else {
          const dir = this.player.x < enemy.x ? -1 : 1;
          if (
            (enemy.type === "snake" || enemy.type === "bulldog") &&
            this.sfx &&
            this.sfx.snake
          ) {
            this.sfx.snake.play();
          }
          if (
            (enemy.type === "ninja" ||
              enemy.type === "redNinja" ||
              enemy.type === "blueNinja") &&
            this.sfx &&
            this.sfx.ninja
          ) {
            this.sfx.ninja.play();
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

  handleSafehouses() {
    if (this.safehouseCooldown > 0) return;
    for (const safehouse of this.level.safehouses) {
      if (rectsOverlap(this.player, safehouse)) {
        this.safehouseCooldown = 2;
        this.checkpoint.x = safehouse.x;
        this.checkpoint.y = safehouse.y;
        this.player.hp = this.player.maxHp;
        this.reduceHeatStars(1);
        break;
      }
    }
  }

  handleExit() {
    const requiredCoins =
      this.level.minCoinsToExit ?? CONFIG.minCoinsToExit;
    if (
      rectsOverlap(this.player, this.level.exit) &&
      this.coinCount >= requiredCoins
    ) {
      this.levelComplete = true;
      this.state = "complete";
      this.completeStats = {
        coins: this.coinCount,
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
      (enemy) => enemy.type === "cop" || enemy.type === "swat"
    ).length;
    const activeNinjas = this.enemies.filter(
      (enemy) =>
        enemy.type === "ninja" ||
        enemy.type === "redNinja" ||
        enemy.type === "blueNinja"
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
    this.player.vx = 160 * knockbackDir;
    this.player.vy = -200;
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
    if (heal) {
      this.player.hp = this.player.maxHp;
    }
    this.player.invuln = 1.0;
    this.player.ammo = this.player.maxAmmo;
    this.player.reloadTimer = 0;
    if (reduceHeat) {
      this.reduceHeatStars(1);
    }
  }

  respawnAtStart({ reduceHeat = true } = {}) {
    this.player.x = this.level.playerSpawn.x;
    this.player.y = this.level.playerSpawn.y;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.invuln = 1.0;
    this.player.ammo = this.player.maxAmmo;
    this.player.reloadTimer = 0;
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

    for (const coin of this.level.coins) {
      coin.collected = false;
    }

    this.player.reset(this.level.playerSpawn.x, this.level.playerSpawn.y);
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
    this.stopMusic();
    if (this.sfx && this.sfx.death) {
      this.sfx.death.play();
    }
  }

  isPlayerInGrass() {
    return this.level.isInGrass(this.player);
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
    this.drawCoins(ctx);
    this.drawSafehouses(ctx);
    this.drawExit(ctx);
    this.drawProjectiles(ctx);
    this.drawEnemyProjectiles(ctx);
    this.drawParticles(ctx);
    this.drawEnemies(ctx);
    this.drawPlayer(ctx);

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

  drawExit(ctx) {
    ctx.fillStyle = "#d94b4b";
    ctx.fillRect(this.level.exit.x, this.level.exit.y, this.level.exit.w, this.level.exit.h);
    ctx.strokeStyle = "#f7b2b2";
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
      const sprite = this.getEnemySprite(enemy);
      if (sprite && sprite.image) {
        this.drawEnemySprite(ctx, enemy, sprite, enemy.flashTimer > 0);
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
    const sprite = this.getPlayerSprite();
    if (!sprite || !sprite.image) {
      ctx.fillStyle = this.player.invuln > 0 ? "#9ef5a1" : "#5ad96b";
      ctx.fillRect(this.player.x, this.player.y, this.player.w, this.player.h);
      return;
    }

    const scale = this.spriteScale || 1;
    const drawW = sprite.image.width * scale;
    const drawH = sprite.image.height * scale;
    const drawX = this.player.x + this.player.w / 2 - drawW / 2;
    const drawY = this.player.y + this.player.h - drawH;

    ctx.save();
    if (sprite.flip) {
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite.image, 0, 0, drawW, drawH);
    } else {
      ctx.drawImage(sprite.image, drawX, drawY, drawW, drawH);
    }
    ctx.restore();
  }

  getPlayerSprite() {
    if (!this.sprites) return null;
    const { idle, runLeft, runRight, jump, gun } = this.sprites;
    const facingLeft = this.player.facing < 0;
    const moving = Math.abs(this.player.vx) > 20;

    if (gun && this.player.shootTimer > 0) {
      return { image: gun, flip: facingLeft };
    }

    if (!this.player.onGround) {
      if (jump) {
        return { image: jump, flip: facingLeft };
      }
      if (idle) {
        return { image: idle, flip: facingLeft };
      }
      return null;
    }

    if (moving) {
      if (facingLeft) {
        if (runLeft) return { image: runLeft, flip: false };
        if (runRight) return { image: runRight, flip: true };
      } else {
        if (runRight) return { image: runRight, flip: false };
        if (runLeft) return { image: runLeft, flip: true };
      }
    }

    if (idle) {
      return { image: idle, flip: facingLeft };
    }

    return null;
  }

  getEnemySprite(enemy) {
    if (!this.enemySprites) return null;
    const facing = enemy.facing || (enemy.vx < 0 ? -1 : 1);
    const flip = facing < 0;

    if (enemy.type === "redNinja") {
      const sprite = this.enemySprites.redNinja || this.enemySprites.ninja;
      return sprite ? { image: sprite, flip } : null;
    }
    if (enemy.type === "blueNinja") {
      const sprite = this.enemySprites.blueNinja || this.enemySprites.ninja;
      return sprite ? { image: sprite, flip } : null;
    }
    if (enemy.type === "ninja") {
      return { image: this.enemySprites.ninja, flip };
    }
    if (enemy.type === "swat") {
      if (enemy.shootTimer > 0) {
        if (facing < 0 && this.enemySprites.swatShootLeft) {
          return { image: this.enemySprites.swatShootLeft, flip: false };
        }
        if (facing > 0 && this.enemySprites.swatShootRight) {
          return { image: this.enemySprites.swatShootRight, flip: false };
        }
      }
      const sprite = this.enemySprites.swat || this.enemySprites.cop;
      return sprite ? { image: sprite, flip } : null;
    }
    if (enemy.type === "cop") {
      return { image: this.enemySprites.cop, flip };
    }
    if (enemy.type === "bulldog") {
      const sprite = this.enemySprites.bulldog || this.enemySprites.snake;
      return sprite ? { image: sprite, flip } : null;
    }
    if (enemy.type === "snake") {
      return { image: this.enemySprites.snake, flip };
    }
    return null;
  }

  drawEnemySprite(ctx, enemy, sprite, flash) {
    const scale =
      (this.enemyScales && this.enemyScales[enemy.type]) || 1;
    const drawW = sprite.image.width * scale;
    const drawH = sprite.image.height * scale;
    const drawX = enemy.x + enemy.w / 2 - drawW / 2;
    const baseOffset =
      enemy.type === "snake" || enemy.type === "bulldog" ? -2 : 0;
    const drawY = enemy.y + enemy.h - drawH + baseOffset;

    if (enemy.type === "snake" || enemy.type === "bulldog") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(drawX + drawW * 0.2, enemy.y + enemy.h - 2, drawW * 0.6, 3);
    }

    if (sprite.flip) {
      ctx.save();
      ctx.translate(drawX + drawW, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(sprite.image, 0, 0, drawW, drawH);
      if (flash) {
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(0, 0, drawW, drawH);
      }
      ctx.restore();
    } else {
      ctx.drawImage(sprite.image, drawX, drawY, drawW, drawH);
      if (flash) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(drawX, drawY, drawW, drawH);
        ctx.restore();
      }
    }
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
