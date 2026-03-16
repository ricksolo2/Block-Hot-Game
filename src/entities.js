import { ENTITY_STATES } from "./animation.js?v=4";
import { CONFIG, PELLETS } from "./constants.js?v=6";
import { clamp } from "./utils.js?v=5";

const MOVE = {
  accel: 1600,
  airAccel: 1100,
  maxSpeed: 120,
  friction: 1700,
  airFriction: 500,
};

const WET_MOVE = {
  accelMultiplier: 0.8,
  maxSpeedMultiplier: 1.08,
  frictionMultiplier: 0.22,
};

const JUMP = {
  speed: 380,
  holdTime: 0.18,
  holdBoost: 900,
  wallKickX: 220,
  coyoteTime: 0.08,
  bufferTime: 0.1,
  wallSlideSpeed: 60,
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
    this.wallSliding = false;
    this.jumpHold = 0;
    this.dashTime = 0;
    this.dashDir = 1;
    this.dashCooldown = 0;
    this.airDashAvailable = true;
    this.dropThroughTimer = 0;
    this.dropThrough = false;
    this.coyoteTimer = 0;
    this.jumpBuffer = 0;
    this.landTimer = 0;
    this.hitAnimTimer = 0;
    this.hp = this.maxHp;
    this.invuln = 0;
    this.hurtTimer = 0;
    this.surfaceType = "air";
    this.ammo = this.maxAmmo;
    this.reloadTimer = 0;
    this.shootTimer = 0;
    this.pelletIndex = 0;
    this.tripleShotTimer = 0;
    this.state = ENTITY_STATES.IDLE;
    this.stateTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  update(dt, input, level, game) {
    this.stateTime += dt;
    this.invuln = Math.max(0, this.invuln - dt);
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.dropThroughTimer = Math.max(0, this.dropThroughTimer - dt);
    this.dropThrough = this.dropThroughTimer > 0;
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.shootTimer = Math.max(0, this.shootTimer - dt);
    this.tripleShotTimer = Math.max(0, this.tripleShotTimer - dt);
    this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.landTimer = Math.max(0, this.landTimer - dt);
    this.hitAnimTimer = Math.max(0, this.hitAnimTimer - dt);
    const wasOnGround = this.onGround;

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

    if (jumpPressed) {
      this.jumpBuffer = JUMP.bufferTime;
    }

    this.wallSliding = false;
    if (!this.onGround && this.vy > 0) {
      const pressingIntoLeftWall = this.touchingLeft && left;
      const pressingIntoRightWall = this.touchingRight && right;
      if (pressingIntoLeftWall || pressingIntoRightWall) {
        this.wallSliding = true;
      }
    }

    if (jumpPressed && down && this.onPlatform) {
      this.dropThroughTimer = 0.18;
      this.jumpBuffer = 0;
    } else if (this.jumpBuffer > 0) {
      if (this.onGround || this.coyoteTimer > 0) {
        this.vy = -JUMP.speed;
        this.jumpHold = 0;
        this.jumpBuffer = 0;
        this.coyoteTimer = 0;
        this.onGround = false;
      } else {
        const wallDir = this.wallSliding
          ? this.touchingLeft
            ? -1
            : this.touchingRight
              ? 1
              : 0
          : 0;
        if (wallDir !== 0) {
          this.vy = -JUMP.speed;
          this.vx = -wallDir * JUMP.wallKickX;
          this.jumpHold = 0;
          this.jumpBuffer = 0;
          this.wallSliding = false;
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
      const onWetGround = this.onGround && this.surfaceType === "wet";
      const accel = this.onGround
        ? MOVE.accel * (onWetGround ? WET_MOVE.accelMultiplier : 1)
        : MOVE.airAccel;
      if (moveDir !== 0) {
        this.vx += moveDir * accel * dt;
      } else {
        const friction = this.onGround
          ? MOVE.friction * (onWetGround ? WET_MOVE.frictionMultiplier : 1)
          : MOVE.airFriction;
        if (this.vx > 0) {
          this.vx = Math.max(0, this.vx - friction * dt);
        } else if (this.vx < 0) {
          this.vx = Math.min(0, this.vx + friction * dt);
        }
      }

      const maxSpeed = this.onGround
        ? MOVE.maxSpeed * (onWetGround ? WET_MOVE.maxSpeedMultiplier : 1)
        : MOVE.maxSpeed;
      this.vx = clamp(this.vx, -maxSpeed, maxSpeed);

      if (jumpHeld && this.vy < 0 && this.jumpHold < JUMP.holdTime) {
        this.vy -= JUMP.holdBoost * dt;
        this.jumpHold += dt;
      }

      if (this.wallSliding) {
        this.vy = Math.min(
          JUMP.wallSlideSpeed,
          this.vy + CONFIG.gravity * dt * 0.3
        );
      } else {
        this.vy += CONFIG.gravity * dt;
      }
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

    if (!wasOnGround && this.onGround) {
      this.landTimer = 0.1;
    }

    if (this.onGround) {
      this.airDashAvailable = true;
      this.coyoteTimer = JUMP.coyoteTime;
      if (this.jumpBuffer > 0 && !down) {
        this.vy = -JUMP.speed;
        this.jumpHold = 0;
        this.jumpBuffer = 0;
        this.coyoteTimer = 0;
        this.onGround = false;
      }
    }

    this.updateState();
  }

  setState(nextState) {
    setEntityState(this, nextState);
  }

  updateState() {
    if (this.hp <= 0) {
      this.setState(ENTITY_STATES.DEAD);
      return;
    }
    if (this.hurtTimer > 0) {
      this.setState(ENTITY_STATES.STUNNED);
      return;
    }
    if (this.shootTimer > 0) {
      this.setState(ENTITY_STATES.ATTACK);
      return;
    }
    if (!this.onGround) {
      this.setState(ENTITY_STATES.JUMP);
      return;
    }
    if (this.dashTime > 0 || Math.abs(this.vx) > 24) {
      this.setState(ENTITY_STATES.RUN);
      return;
    }
    this.setState(ENTITY_STATES.IDLE);
  }
}

export class Enemy {
  constructor(type, x, y, options = {}) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    const size = getEnemySize(type);
    this.w = size.w;
    this.h = size.h;
    const baseHp = type === "cop" || type === "swat" || type === "bulldog" ? 2 : 1;
    this.hp = options.hp || baseHp;
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
    this.attackTimer = 0;
    this.attackCooldown = 0;
    this.attackDir = 1;
    this.facing = 1;
    this.shootTimer = 0;
    this.shootCooldown = 0;
    this.ambush = options.ambush || false;
    this.patrolInterval = options.patrolInterval || 2;
    this.patrolTimer = this.patrolInterval;
    this.flashTimer = 0;
    this.state = ENTITY_STATES.IDLE;
    this.stateTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.deathTimer = 0;
    this.deathDuration = 0.35;
    this.remove = false;
  }

  update(dt, game, level) {
    this.stateTime += dt;
    this.shootTimer = Math.max(0, this.shootTimer - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    if (this.state === ENTITY_STATES.DEAD || this.hp <= 0) {
      this.vx = 0;
      this.stunTimer = 0;
      this.attackTimer = 0;
      this.lungeTimer = 0;
      this.deathTimer = Math.max(0, this.deathTimer - dt);
      this.remove = this.deathTimer <= 0;
      this.setState(ENTITY_STATES.DEAD);
      return;
    }
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.vx = 0;
    } else if (this.type === "snake") {
      this.updateSnake(dt, game);
    } else if (this.type === "bulldog") {
      this.updateBulldog(dt, game);
    } else if (this.type === "cop") {
      this.updateCop(dt, game);
    } else if (this.type === "swat") {
      this.updateSwat(dt, game);
    } else if (this.type === "ninja") {
      this.updateNinja(dt, game);
    } else if (this.type === "redNinja" || this.type === "blueNinja") {
      this.updateNinja(dt, game);
    }

    this.vy += CONFIG.gravity * dt;
    level.moveEntity(this, dt, true);
    if (this.vx !== 0) {
      this.facing = Math.sign(this.vx);
    }
    this.updateState();
  }

  setState(nextState) {
    setEntityState(this, nextState);
  }

  markDead(duration = 0.35) {
    this.hp = 0;
    this.vx = 0;
    this.vy = 0;
    this.stunTimer = 0;
    this.attackTimer = 0;
    this.lungeTimer = 0;
    this.deathDuration = duration;
    this.deathTimer = Math.max(this.deathTimer, duration);
    this.setState(ENTITY_STATES.DEAD);
  }

  updateState() {
    if (this.state === ENTITY_STATES.DEAD || this.hp <= 0) {
      this.setState(ENTITY_STATES.DEAD);
      return;
    }
    if (this.stunTimer > 0) {
      this.setState(ENTITY_STATES.STUNNED);
      return;
    }
    if (this.shootTimer > 0 || this.attackTimer > 0 || this.lungeTimer > 0) {
      this.setState(ENTITY_STATES.ATTACK);
      return;
    }
    if (Math.abs(this.vx) > 10) {
      this.setState(ENTITY_STATES.RUN);
      return;
    }
    this.setState(ENTITY_STATES.IDLE);
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

  updateBulldog(dt, game) {
    if (this.lungeTimer > 0) {
      this.lungeTimer -= dt;
      this.vx = this.lungeDir * 180;
      if (this.lungeTimer <= 0) {
        this.vx = 0;
      }
      return;
    }

    this.cooldown = Math.max(0, this.cooldown - dt);
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);

    if (this.cooldown <= 0 && Math.abs(dx) < 90 && dy < 40) {
      this.lungeTimer = 0.24;
      this.cooldown = 1.2;
      this.lungeDir = Math.sign(dx) || this.patrolDir;
      this.vx = this.lungeDir * 180;
      if (game.sfx && game.sfx.bulldog) {
        game.sfx.bulldog.play();
      }
      return;
    }

    const patrolSpeed = 45;
    this.vx = this.patrolDir * patrolSpeed;
    if (Math.abs(this.x - this.homeX) > this.patrolRange) {
      this.patrolDir *= -1;
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

  updateSwat(dt, game) {
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);
    const inRange = Math.abs(dx) < 200 && dy < 80;
    const patrolSpeed = 35;

    if (inRange) {
      this.facing = Math.sign(dx) || this.facing;
      this.vx = 0;
      if (this.shootCooldown <= 0) {
        this.shootTimer = 0.22;
        this.shootCooldown = 1.1;
        game.spawnEnemyProjectile(this, this.facing);
      }
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
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.attackTimer > 0) {
      this.attackTimer = Math.max(0, this.attackTimer - dt);
      this.vx = this.attackDir * 220;
      return;
    }

    if (inRange) {
      if (this.onGround && this.attackCooldown <= 0 && Math.abs(dx) < 110) {
        this.attackDir = Math.sign(dx) || this.patrolDir;
        this.vx = this.attackDir * 220;
        this.vy = -280;
        this.attackTimer = 0.22;
        this.attackCooldown = 0.7;
        if (game.sfx && game.sfx.ninja) {
          game.sfx.ninja.play();
        }
        return;
      }
      this.vx = Math.sign(dx) * chaseSpeed;
      if (this.onGround && this.cooldown <= 0) {
        const playerAbove = game.player.y + game.player.h < this.y - 6;
        const stuckOnWall = this.touchingLeft || this.touchingRight;
        if (playerAbove || stuckOnWall || Math.abs(dx) < 70) {
          this.vy = -320;
          this.vx = Math.sign(dx) * 200;
          this.cooldown = 0.6;
          if (game.sfx && game.sfx.ninja) {
            game.sfx.ninja.play();
          }
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

export class EnemyProjectile {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = 5;
    this.h = 3;
    this.life = 1.4;
    this.damage = 1;
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

function getEnemySize(type) {
  switch (type) {
    case "cop":
    case "swat":
      return { w: 12, h: 16 };
    case "bulldog":
      return { w: 14, h: 10 };
    case "ninja":
    case "redNinja":
    case "blueNinja":
    case "snake":
    default:
      return { w: 12, h: 10 };
  }
}

function setEntityState(entity, nextState) {
  if (entity.state === nextState) return;
  entity.state = nextState;
  entity.stateTime = 0;
  entity.animationFrame = 0;
  entity.animationTimer = 0;
}
