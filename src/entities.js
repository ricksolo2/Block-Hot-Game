import { CONFIG, PELLETS } from "./constants.js";
import { clamp } from "./utils.js";

const MOVE = {
  accel: 1600,
  airAccel: 1100,
  maxSpeed: 120,
  friction: 1700,
  airFriction: 500,
};

const JUMP = {
  speed: 380,
  holdTime: 0.18,
  holdBoost: 900,
  wallKickX: 220,
};

const DASH = {
  speed: 280,
  duration: 0.12,
  cooldown: 0.45,
};

export class Player {
  constructor(x, y) {
    this.w = 12;
    this.h = 16;
    this.maxHp = 5;
    this.maxAmmo = 10;
    this.reloadDuration = 1.0;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.onPlatform = false;
    this.touchingLeft = false;
    this.touchingRight = false;
    this.jumpHold = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.airDashAvailable = true;
    this.dropThroughTimer = 0;
    this.dropThrough = false;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.ammo = this.maxAmmo;
    this.reloadTimer = 0;
    this.shootTimer = 0;
    this.pelletIndex = 0;
  }

  update(dt, input, level, game) {
    this.invuln = Math.max(0, this.invuln - dt);
    this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
    this.dropThrough = this.dropThroughTimer > 0;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.shootTimer = Math.max(0, this.shootTimer - dt);

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.ammo = this.maxAmmo;
      }
    }

    if (input.wasPressed("Digit1")) this.pelletIndex = 0;
    if (input.wasPressed("Digit2")) this.pelletIndex = 1;
    if (input.wasPressed("Digit3")) this.pelletIndex = 2;
    if (input.wasPressed("Digit4")) this.pelletIndex = 3;
    if (input.wasPressed("KeyQ")) {
      this.pelletIndex = (this.pelletIndex + PELLETS.length - 1) % PELLETS.length;
    }
    if (input.wasPressed("KeyE")) {
      this.pelletIndex = (this.pelletIndex + 1) % PELLETS.length;
    }

    if (
      input.wasPressed("KeyR") &&
      this.reloadTimer <= 0 &&
      this.ammo < this.maxAmmo
    ) {
      this.reloadTimer = this.reloadDuration;
    }

    const left = input.isDown("ArrowLeft") || input.isDown("KeyA");
    const right = input.isDown("ArrowRight") || input.isDown("KeyD");
    const down = input.isDown("ArrowDown") || input.isDown("KeyS");
    const jumpPressed = input.wasPressed("KeyZ") || input.wasPressed("Space");
    const jumpHeld = input.isDown("KeyZ") || input.isDown("Space");
    const shootPressed = input.wasPressed("KeyX");
    const dashPressed = input.wasPressed("KeyC");

    const moveDir = (left ? -1 : 0) + (right ? 1 : 0);

    if (moveDir !== 0) {
      this.facing = moveDir;
    }

    if (jumpPressed && down && this.onPlatform) {
      this.dropThroughTimer = 0.18;
    } else if (jumpPressed) {
      if (this.onGround) {
        this.vy = -JUMP.speed;
        this.jumpHold = 0;
      } else {
        const wallDir = this.touchingLeft ? -1 : this.touchingRight ? 1 : 0;
        if (wallDir !== 0) {
          this.vy = -JUMP.speed;
          this.vx = -wallDir * JUMP.wallKickX;
          this.jumpHold = 0;
        }
      }
    }

    if (dashPressed && this.dashCooldown <= 0) {
      if (this.onGround || this.airDashAvailable) {
        this.dashTime = DASH.duration;
        this.dashCooldown = DASH.cooldown;
        this.dashDir = moveDir !== 0 ? moveDir : this.facing;
        this.vx = this.dashDir * DASH.speed;
        this.vy = 0;
        if (!this.onGround) {
          this.airDashAvailable = false;
        }
      }
    }

    if (this.dashTime > 0) {
      this.dashTime -= dt;
      this.vx = this.dashDir * DASH.speed;
      this.vy = 0;
    } else {
      const accel = this.onGround ? MOVE.accel : MOVE.airAccel;
      if (moveDir !== 0) {
        this.vx += moveDir * accel * dt;
      } else {
        const friction = this.onGround ? MOVE.friction : MOVE.airFriction;
        if (this.vx > 0) {
          this.vx = Math.max(0, this.vx - friction * dt);
        } else if (this.vx < 0) {
          this.vx = Math.min(0, this.vx + friction * dt);
        }
      }

      this.vx = clamp(this.vx, -MOVE.maxSpeed, MOVE.maxSpeed);

      if (jumpHeld && this.vy < 0 && this.jumpHold < JUMP.holdTime) {
        this.vy -= JUMP.holdBoost * dt;
        this.jumpHold += dt;
      }

      this.vy += CONFIG.gravity * dt;
    }

    if (shootPressed && this.shootTimer <= 0) {
      if (this.reloadTimer <= 0 && this.ammo > 0) {
        game.spawnProjectile(this);
        this.ammo -= 1;
        this.shootTimer = 0.16;
        if (this.ammo === 0) {
          this.reloadTimer = this.reloadDuration;
        }
      } else if (this.reloadTimer <= 0 && this.ammo === 0) {
        this.reloadTimer = this.reloadDuration;
      }
    }

    level.moveEntity(this, dt, true);

    if (this.onGround) {
      this.airDashAvailable = true;
    }
  }
}

export class Enemy {
  constructor(type, x, y, options = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = type === "cop" ? 12 : 12;
    this.h = type === "cop" ? 16 : 10;
    this.hp = options.hp || (type === "cop" ? 2 : 1);
    this.maxHp = this.hp;
    this.stunTimer = 0;
    this.onGround = false;
    this.touchingLeft = false;
    this.touchingRight = false;
    this.homeX = x;
    this.patrolRange = options.patrolRange || 80;
    this.patrolDir = 1;
    this.lungeTimer = 0;
    this.cooldown = 0;
    this.ambush = options.ambush || false;
    this.patrolInterval = options.patrolInterval || 2;
    this.patrolTimer = this.patrolInterval;
    this.flashTimer = 0;
  }

  update(dt, game, level) {
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.vx = 0;
    } else if (this.type === "snake") {
      this.updateSnake(dt, game);
    } else if (this.type === "cop") {
      this.updateCop(dt, game);
    } else if (this.type === "ninja") {
      this.updateNinja(dt, game);
    }

    this.vy += CONFIG.gravity * dt;
    level.moveEntity(this, dt, true);
  }

  updateSnake(dt, game) {
    if (this.lungeTimer > 0) {
      this.lungeTimer -= dt;
      this.vx = this.lungeDir * 200;
      if (this.lungeTimer <= 0) {
        this.vx = 0;
      }
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);
    const playerInGrass = game.isPlayerInGrass();

    if (this.ambush) {
      const patrolSpeed = 20;
      this.patrolTimer -= dt;
      if (this.patrolTimer <= 0) {
        this.patrolDir *= -1;
        this.patrolTimer = this.patrolInterval;
      }
      this.vx = this.patrolDir * patrolSpeed;
    }

    if (this.cooldown <= 0 && Math.abs(dx) < 80 && dy < 40) {
      if (!this.ambush || playerInGrass) {
        this.lungeTimer = 0.2;
        this.cooldown = 1.1;
        this.lungeDir = Math.sign(dx) || 1;
        this.vx = this.lungeDir * 200;
      }
    } else if (!this.ambush) {
      this.vx = 0;
    }
  }

  updateCop(dt, game) {
    const heat = game.heatStars;
    const patrolSpeed = 40 + heat * 8;
    const chaseSpeed = 70 + heat * 12;
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);
    const inRange = Math.abs(dx) < 140 && dy < 48;

    if (inRange) {
      this.vx = Math.sign(dx) * chaseSpeed;
    } else {
      this.vx = this.patrolDir * patrolSpeed;
      if (Math.abs(this.x - this.homeX) > this.patrolRange) {
        this.patrolDir *= -1;
      }
    }
  }

  updateNinja(dt, game) {
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);
    const inRange = Math.abs(dx) < 160 && dy < 72;
    const chaseSpeed = 80;
    const patrolSpeed = 50;

    this.cooldown = Math.max(0, this.cooldown - dt);
    if (inRange) {
      this.vx = Math.sign(dx) * chaseSpeed;
      if (this.onGround && this.cooldown <= 0) {
        const playerAbove = game.player.y + game.player.h < this.y - 6;
        const stuckOnWall = this.touchingLeft || this.touchingRight;
        if (playerAbove || stuckOnWall || Math.abs(dx) < 60) {
          this.vy = -300;
          this.vx = Math.sign(dx) * 180;
          this.cooldown = 0.9;
        }
      }
    } else {
      this.vx = this.patrolDir * patrolSpeed;
      if (Math.abs(this.x - this.homeX) > this.patrolRange) {
        this.patrolDir *= -1;
      }
    }
  }
}

export class Projectile {
  constructor(x, y, vx, vy, pellet) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = 4;
    this.h = 4;
    this.pellet = pellet;
    this.life = 1.2;
    this.pierce = pellet.pierce || 0;
    this.dead = false;
  }

  update(dt, level) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;

    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    const tiles = level.tilesInRect(this);
    for (const tile of tiles) {
      if (level.isSolidTile(tile.type)) {
        this.dead = true;
        return;
      }
    }
  }
}
