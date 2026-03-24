import { ENTITY_STATES } from "./animation.js?v=5";
import { CONFIG, PELLETS } from "./constants.js?v=6";
import { clamp, rectsOverlap } from "./utils.js?v=5";

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

export const BOSS_STATES = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  GROUND_POUND: "ground_pound",
  CHARGE: "charge",
  SWIPE: "swipe",
  SHOOT: "shoot",
  STUNNED: "stunned",
  TRANSITION: "transition",
  DEFEATED: "defeated",
});

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
    this.hasDoubleJump = true;
    this.doubleJumpAvailable = true;
    this.justDoubleJumped = false;
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
    this.blocking = false;
    this.state = ENTITY_STATES.IDLE;
    this.stateTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  update(dt, input, level, game) {
    this.stateTime += dt;
    this.justDoubleJumped = false;
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
    const dashKey = input.isDown("KeyC");
    const dashPressed = input.wasPressed("KeyC");

    const moveDir = (left ? -1 : 0) + (right ? 1 : 0);
    const notMoving = moveDir === 0;

    this.blocking =
      (down || (dashKey && notMoving)) &&
      this.onGround &&
      this.dashTime <= 0;

    if (!this.blocking && moveDir !== 0) {
      this.facing = moveDir;
    }

    if (this.blocking) {
      this.vx = 0;
      this.jumpBuffer = 0;
      this.jumpHold = 0;
      this.wallSliding = false;
      this.vy += CONFIG.gravity * dt;
      level.moveEntity(this, dt, true);

      if (!wasOnGround && this.onGround) {
        this.landTimer = 0.1;
      }

      if (this.onGround) {
        this.airDashAvailable = true;
        this.doubleJumpAvailable = true;
        this.coyoteTimer = JUMP.coyoteTime;
      }

      this.updateState();
      return;
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
        } else if (this.hasDoubleJump && this.doubleJumpAvailable) {
          this.vy = -JUMP.speed * 0.85;
          this.jumpHold = 0;
          this.jumpBuffer = 0;
          this.doubleJumpAvailable = false;
          this.justDoubleJumped = true;
        }
      }
    }

    if (dashPressed && this.dashCooldown <= 0 && !this.blocking) {
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
      this.doubleJumpAvailable = true;
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
    this.telegraphTimer = 0;
    this.facing = 1;
    this.shootTimer = 0;
    this.shootCooldown = 0;
    this.shootPending = false;
    this.ambush = options.ambush || false;
    this.patrolInterval = options.patrolInterval || 2;
    this.patrolTimer = this.patrolInterval;
    this.flashTimer = 0;
    this.state = ENTITY_STATES.IDLE;
    this.stateTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.graceDuration = this.type === "snake" ? 2.5 : 1.5;
    this.graceTimer =
      options.graceTimer !== undefined && options.graceTimer !== null
        ? options.graceTimer
        : this.graceDuration;
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
      this.telegraphTimer = 0;
      this.lungeTimer = 0;
      this.shootPending = false;
      this.deathTimer = Math.max(0, this.deathTimer - dt);
      this.remove = this.deathTimer <= 0;
      this.setState(ENTITY_STATES.DEAD);
      return;
    }
    if (this.graceTimer > 0) {
      this.graceTimer = Math.max(0, this.graceTimer - dt);
      this.vx = this.patrolDir * 20;
      if (Math.abs(this.x - this.homeX) > this.patrolRange) {
        this.patrolDir *= -1;
      }
      this.vy += CONFIG.gravity * dt;
      level.moveEntity(this, dt, true);
      if (this.vx !== 0) {
        this.facing = Math.sign(this.vx);
        this.setState(ENTITY_STATES.RUN);
      } else {
        this.setState(ENTITY_STATES.IDLE);
      }
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

    if (
      Math.abs(this.vx) < 8 &&
      this.stunTimer <= 0 &&
      this.attackTimer <= 0 &&
      this.telegraphTimer <= 0 &&
      this.lungeTimer <= 0 &&
      this.shootTimer <= 0 &&
      !this.shootPending
    ) {
      this.vx = 0;
    }

    this.vy += CONFIG.gravity * dt;
    level.moveEntity(this, dt, true);
    if (Math.abs(this.vx) > 12) {
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
    this.telegraphTimer = 0;
    this.lungeTimer = 0;
    this.shootPending = false;
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
    if (
      this.shootTimer > 0 ||
      this.attackTimer > 0 ||
      this.telegraphTimer > 0 ||
      this.lungeTimer > 0 ||
      this.shootPending
    ) {
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
      game.playSfx(game.sfx && game.sfx.bulldog ? game.sfx.bulldog : null);
      return;
    }

    const patrolSpeed = 45;
    this.vx = this.patrolDir * patrolSpeed;
    if (Math.abs(this.x - this.homeX) > this.patrolRange) {
      this.patrolDir *= -1;
    }
  }

  updateCop(dt, game, speedMult = 1) {
    const heat = game.heatStars;
    const patrolSpeed = (40 + heat * 8) * speedMult;
    const chaseSpeed = (70 + heat * 12) * speedMult;
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);
    const masked =
      game.player &&
      game.player.hasPowerup &&
      game.player.hasPowerup("maskOn");
    const inRange = Math.abs(dx) < 140 && dy < 48 && !masked;
    const spacingBias = game.getEnemySpacingBias(
      this,
      ["cop", "swat"],
      34,
      26,
      54
    );
    const crowded = game.isEnemyCrowded(this, ["cop", "swat"], 24, 22);

    if (this.shootPending) {
      this.vx = 0;
      this.facing = Math.sign(dx) || this.facing;
      if (this.shootTimer <= 0) {
        this.shootPending = false;
        this.shootCooldown = 2.0;
        game.spawnEnemyProjectile(this, this.facing);
      }
      return;
    }

    if (inRange) {
      if (heat >= 3 && Math.abs(dx) > 60 && Math.abs(dx) < 140) {
        this.vx = 0;
        this.facing = Math.sign(dx) || this.facing;
        if (this.shootCooldown <= 0) {
          this.shootTimer = 0.2;
          this.shootPending = true;
        }
        return;
      }

      const desiredVx = Math.sign(dx) * chaseSpeed;
      const packedSpeed = crowded ? chaseSpeed * 0.72 : chaseSpeed;
      this.vx = clamp(desiredVx + spacingBias, -packedSpeed, packedSpeed);
    } else {
      this.vx = clamp(
        this.patrolDir * patrolSpeed + spacingBias * 0.45,
        -patrolSpeed,
        patrolSpeed
      );
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
      if (Math.abs(dx) > 14) {
        this.facing = Math.sign(dx) || this.facing;
      }
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

  updateNinja(dt, game, speedMult = 1) {
    const dx = game.player.x - this.x;
    const dy = Math.abs(game.player.y - this.y);
    const inRange = Math.abs(dx) < 160 && dy < 72;
    const chaseSpeed = 80 * speedMult;
    const patrolSpeed = 50 * speedMult;
    const retreatDuration = 0.8;
    const recoveryDuration = this.type === "redNinja" ? 1.0 : 1.2;
    const spacingBias = game.getEnemySpacingBias(
      this,
      ["ninja", "redNinja", "blueNinja"],
      36,
      28,
      68
    );
    const crowded = game.isEnemyCrowded(
      this,
      ["ninja", "redNinja", "blueNinja"],
      26,
      22
    );

    this.cooldown = Math.max(0, this.cooldown - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    if (this.attackTimer > 0) {
      this.attackTimer = Math.max(0, this.attackTimer - dt);
      this.vx = this.attackDir * 220 * speedMult;
      return;
    }

    if (this.telegraphTimer > 0) {
      this.telegraphTimer = Math.max(0, this.telegraphTimer - dt);
      this.vx = 0;
      this.facing = this.attackDir || this.facing;
      if (this.telegraphTimer <= 0 && this.onGround) {
        this.vx = this.attackDir * 220 * speedMult;
        this.vy = -280;
        this.attackTimer = 0.22;
        this.attackCooldown = recoveryDuration + retreatDuration;
        game.playSfx(game.sfx && game.sfx.ninja ? game.sfx.ninja : null);
      }
      return;
    }

    if (this.attackCooldown > retreatDuration) {
      this.vx = 0;
      return;
    }

    if (this.attackCooldown > 0) {
      const retreatDir = this.x < game.player.x ? -1 : 1;
      this.vx = retreatDir * patrolSpeed * 0.6;
      return;
    }

    if (inRange) {
      if (Math.abs(dx) > 70) {
        const formationSpeed = crowded ? chaseSpeed * 0.72 : chaseSpeed;
        this.vx = clamp(
          Math.sign(dx) * chaseSpeed + spacingBias,
          -formationSpeed,
          formationSpeed
        );
      } else {
        this.vx = 0;
        this.attackDir = Math.sign(dx) || this.patrolDir;
        this.facing = this.attackDir || this.facing;
        if (this.onGround && this.cooldown <= 0 && !crowded) {
          this.telegraphTimer = 0.6;
          return;
        }
      }

      if (this.onGround && this.cooldown <= 0) {
        const playerAbove = game.player.y + game.player.h < this.y - 6;
        const stuckOnWall = this.touchingLeft || this.touchingRight;
        if (playerAbove || stuckOnWall) {
          this.vy = -320;
          this.vx = Math.sign(dx) * 200 * speedMult;
          this.cooldown = 0.8;
          game.playSfx(game.sfx && game.sfx.ninja ? game.sfx.ninja : null);
        }
      }
    } else {
      this.vx = clamp(
        this.patrolDir * patrolSpeed + spacingBias * 0.5,
        -patrolSpeed,
        patrolSpeed
      );
      if (Math.abs(this.x - this.homeX) > this.patrolRange) {
        this.patrolDir *= -1;
      }
    }
  }
}

export class Boss {
  constructor(x, y, options = {}) {
    this.type = options.type || "enforcer";
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = options.w || 20;
    this.h = options.h || 28;
    this.hp = options.hp || 30;
    this.maxHp = options.maxHp || this.hp;
    this.phase = 1;
    this.contactDamage = 2;
    this.flashTimer = 0;
    this.stunTimer = 0;
    this.chargeTimer = 0;
    this.attackCooldown = 0;
    this.chargeCooldown = 0;
    this.facing = -1;
    this.state = BOSS_STATES.IDLE;
    this.stateTime = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
    this.onGround = false;
    this.touchingLeft = false;
    this.touchingRight = false;
    this.phaseTransitionTimer = 0;
    this.walkTimer = 2;
    this.actionIndex = 0;
    this.stepTimer = 0.24;
    this.groundPoundTelegraph = 0;
    this.groundPoundJumped = false;
    this.groundPoundLanded = false;
    this.groundPoundTargetX = x;
    this.groundPoundLandTimer = 0;
    this.chargeTelegraph = 0;
    this.chargeActive = false;
    this.swipeTimer = 0;
    this.swipeHasHit = false;
    this.shootTimer = 0;
    this.shootHasFired = false;
    this.phase2AddsSpawned = false;
    this.phase3ArenaBroken = false;
    this.introDropping = false;
    this.introLanded = false;
    this.introActive = false;
    this.alpha = 1;
  }

  update(dt, game, level) {
    this.stateTime += dt;
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
    this.groundPoundLandTimer = Math.max(0, this.groundPoundLandTimer - dt);

    if (this.state === BOSS_STATES.DEFEATED || this.hp <= 0) {
      this.vx = 0;
      this.vy = 0;
      this.setState(BOSS_STATES.DEFEATED);
      return;
    }

    const playerCenterX = game.player.x + game.player.w / 2;
    if (!this.chargeActive && Math.abs(playerCenterX - this.x) > 4) {
      this.facing = Math.sign(playerCenterX - (this.x + this.w / 2)) || this.facing;
    }

    const nextPhase = this.hp <= 10 ? 3 : this.hp <= 20 ? 2 : 1;
    if (nextPhase !== this.phase && this.state !== BOSS_STATES.TRANSITION) {
      this.beginPhaseTransition(nextPhase, game);
    }

    if (this.state === BOSS_STATES.TRANSITION) {
      this.phaseTransitionTimer = Math.max(0, this.phaseTransitionTimer - dt);
      this.vx = 0;
      if (this.phaseTransitionTimer <= 0) {
        this.walkTimer = this.phase === 3 ? 0.55 : 1.1;
        this.setState(BOSS_STATES.IDLE);
      }
    } else if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.vx = 0;
      this.setState(BOSS_STATES.STUNNED);
    } else {
      switch (this.state) {
        case BOSS_STATES.GROUND_POUND:
          this.updateGroundPound(dt, game);
          break;
        case BOSS_STATES.CHARGE:
          this.updateCharge(dt);
          break;
        case BOSS_STATES.SWIPE:
          this.updateSwipe(dt, game);
          break;
        case BOSS_STATES.SHOOT:
          this.updateShoot(dt, game);
          break;
        default:
          this.updateNeutral(dt, game);
          break;
      }
    }

    this.vy += CONFIG.gravity * dt;
    level.moveEntity(this, dt, true);

    if (
      this.state === BOSS_STATES.GROUND_POUND &&
      this.groundPoundJumped &&
      !this.groundPoundLanded &&
      this.onGround
    ) {
      this.landGroundPound(game);
    }

    if (
      this.state === BOSS_STATES.CHARGE &&
      this.chargeActive &&
      (this.touchingLeft || this.touchingRight)
    ) {
      this.finishCharge(game);
    }

    if (
      this.state === BOSS_STATES.WALK &&
      this.onGround &&
      Math.abs(this.vx) > 1
    ) {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.phase >= 2 ? 0.28 : 0.4;
        game.addShake(this.phase >= 2 ? 0.8 : 0.5, 0.05);
      }
    }
  }

  beginIntroDrop(startY) {
    this.introActive = true;
    this.introDropping = true;
    this.introLanded = false;
    this.x = this.x;
    this.y = startY;
    this.vx = 0;
    this.vy = 20;
  }

  updateIntroDrop(dt, level) {
    if (!this.introDropping) return false;
    this.vy += CONFIG.gravity * 1.2 * dt;
    level.moveEntity(this, dt, true);
    if (this.onGround) {
      this.introDropping = false;
      this.introLanded = true;
      this.vx = 0;
      this.vy = 0;
      return true;
    }
    return false;
  }

  beginPhaseTransition(phase, game) {
    this.phase = phase;
    this.phaseTransitionTimer = 1.5;
    this.walkTimer = this.phase === 3 ? 0.55 : 1.2;
    this.chargeActive = false;
    this.chargeTelegraph = 0;
    this.groundPoundJumped = false;
    this.groundPoundLanded = false;
    this.swipeTimer = 0;
    this.shootTimer = 0;
    this.shootHasFired = false;
    this.vx = 0;
    this.vy = 0;
    this.setState(BOSS_STATES.TRANSITION);
    if (phase === 2 && !this.phase2AddsSpawned) {
      this.phase2AddsSpawned = true;
      game.spawnBossPhaseSnakes();
    }
    if (phase === 3 && !this.phase3ArenaBroken) {
      this.phase3ArenaBroken = true;
      game.destroyBossArenaPlatforms();
    }
  }

  updateNeutral(dt, game) {
    const playerCenterX = game.player.x + game.player.w / 2;
    const playerCenterY = game.player.y + game.player.h / 2;
    const centerX = this.x + this.w / 2;
    const centerY = this.y + this.h / 2;
    const dx = playerCenterX - centerX;
    const dy = Math.abs(playerCenterY - centerY);
    const distX = Math.abs(dx);

    if (distX < 40 && dy < 42 && this.attackCooldown <= 0 && this.onGround) {
      this.startSwipe();
      return;
    }

    this.walkTimer = Math.max(0, this.walkTimer - dt);
    const walkSpeed = this.getWalkSpeed();

    if (
      this.phase >= 2 &&
      distX > 132 &&
      dy < 88 &&
      this.attackCooldown <= 0 &&
      this.onGround &&
      this.actionIndex % 3 === 2
    ) {
      this.actionIndex += 1;
      this.startShoot();
      return;
    }

    if (this.walkTimer > 0) {
      this.vx = (Math.sign(dx) || this.facing || -1) * walkSpeed;
      this.setState(BOSS_STATES.WALK);
      return;
    }

    const useCharge =
      this.phase >= 2 &&
      this.chargeCooldown <= 0 &&
      this.onGround &&
      (this.phase === 3 || this.actionIndex % 2 === 1);

    if (useCharge) {
      this.actionIndex += 1;
      this.startCharge();
      return;
    }

    if (this.onGround && (distX <= 80 || this.phase === 3)) {
      this.actionIndex += 1;
      this.startGroundPound(playerCenterX);
      return;
    }

    this.walkTimer = this.phase === 3 ? 0.55 : 1.2;
    this.vx = (Math.sign(dx) || this.facing || -1) * walkSpeed;
    this.setState(BOSS_STATES.WALK);
  }

  startGroundPound(targetX) {
    this.groundPoundTelegraph = 0.3;
    this.groundPoundJumped = false;
    this.groundPoundLanded = false;
    this.groundPoundTargetX = targetX;
    this.vx = 0;
    this.setState(BOSS_STATES.GROUND_POUND);
  }

  updateGroundPound(dt) {
    if (!this.groundPoundJumped) {
      this.vx = 0;
      this.groundPoundTelegraph = Math.max(0, this.groundPoundTelegraph - dt);
      if (this.groundPoundTelegraph <= 0) {
        this.groundPoundJumped = true;
        this.vy = -(this.phase >= 2 ? 400 : 300);
        if (this.phase === 3) {
          const dx = this.groundPoundTargetX - (this.x + this.w / 2);
          this.vx = clamp(dx * 2.2, -220, 220);
        }
      }
      return;
    }

    if (this.phase !== 3) {
      this.vx *= 0.98;
    }
  }

  landGroundPound(game) {
    this.groundPoundLanded = true;
    this.groundPoundLandTimer = 0.1;
    this.vx = 0;
    game.onBossGroundPoundLand(this);
    this.stunTimer = this.phase === 1 ? 1.5 : this.phase === 2 ? 1.0 : 0.45;
    this.attackCooldown = 0.55;
    this.walkTimer = this.phase === 3 ? 0.45 : 0.9;
    this.setState(BOSS_STATES.STUNNED);
  }

  startCharge() {
    this.chargeActive = false;
    this.chargeTelegraph = 0.5;
    this.chargeTimer = 0;
    this.vx = 0;
    this.chargeCooldown = this.phase === 3 ? 1.0 : 2.1;
    this.setState(BOSS_STATES.CHARGE);
  }

  updateCharge(dt) {
    if (!this.chargeActive) {
      this.vx = 0;
      this.chargeTelegraph = Math.max(0, this.chargeTelegraph - dt);
      if (this.chargeTelegraph <= 0) {
        this.chargeActive = true;
        this.chargeTimer = 0;
      }
      return;
    }

    this.chargeTimer += dt;
    this.vx = (this.facing || -1) * 280;
  }

  finishCharge(game) {
    this.chargeActive = false;
    this.vx = 0;
    this.stunTimer = this.phase === 3 ? 0.8 : 2.0;
    this.attackCooldown = 0.6;
    this.walkTimer = this.phase === 3 ? 0.35 : 0.8;
    this.setState(BOSS_STATES.STUNNED);
    game.onBossChargeImpact(this);
  }

  startSwipe() {
    this.swipeTimer = 0.34;
    this.swipeHasHit = false;
    this.vx = 0;
    this.attackCooldown = 0.75;
    this.setState(BOSS_STATES.SWIPE);
  }

  updateSwipe(dt, game) {
    this.vx = 0;
    this.swipeTimer = Math.max(0, this.swipeTimer - dt);

    if (!this.swipeHasHit && this.swipeTimer <= 0.16) {
      this.swipeHasHit = true;
      const hitbox = {
        x:
          this.facing < 0
            ? this.x - 20
            : this.x + this.w - 2,
        y: this.y + 4,
        w: 22,
        h: this.h - 6,
      };
      if (
        game.player.invuln <= 0 &&
        !game.bust.active &&
        rectsOverlap(game.player, hitbox)
      ) {
        game.damagePlayer(2, this.facing, {
          knockbackX: 200,
          knockbackY: -180,
          source: "boss",
        });
      }
    }

    if (this.swipeTimer <= 0) {
      this.walkTimer = this.phase === 3 ? 0.35 : 0.75;
      this.setState(BOSS_STATES.IDLE);
    }
  }

  startShoot() {
    this.shootTimer = 0.34;
    this.shootHasFired = false;
    this.vx = 0;
    this.attackCooldown = this.phase === 3 ? 0.9 : 1.2;
    this.setState(BOSS_STATES.SHOOT);
  }

  updateShoot(dt, game) {
    this.vx = 0;
    this.shootTimer = Math.max(0, this.shootTimer - dt);

    if (!this.shootHasFired && this.shootTimer <= 0.16) {
      this.shootHasFired = true;
      game.spawnBossProjectile(this);
    }

    if (this.shootTimer <= 0) {
      this.walkTimer = this.phase === 3 ? 0.3 : 0.65;
      this.setState(BOSS_STATES.IDLE);
    }
  }

  applyDamage(pellet, direction) {
    const multiplier = this.phase === 3 ? 2 : 1;
    const damage = (((pellet && pellet.damage) || 1) * multiplier);
    this.hp -= damage;
    this.flashTimer = 0.08;
    this.vx += (direction || 1) * 36;
    return damage;
  }

  getContactDamage() {
    if (this.state === BOSS_STATES.CHARGE && this.chargeActive) {
      return 3;
    }
    return this.contactDamage;
  }

  markDefeated() {
    this.hp = 0;
    this.vx = 0;
    this.vy = 0;
    this.stunTimer = 0;
    this.chargeActive = false;
    this.alpha = 1;
    this.setState(BOSS_STATES.DEFEATED);
  }

  getWalkSpeed() {
    return this.phase === 1 ? 50 : this.phase === 2 ? 70 : 86;
  }

  setState(nextState) {
    setEntityState(this, nextState);
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
  constructor(x, y, vx, vy, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.w = options.w || 5;
    this.h = options.h || 3;
    this.life = options.life || 1.4;
    this.damage = options.damage || 1;
    this.color = options.color || "#ff8a8a";
    this.style = options.style || "bullet";
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
