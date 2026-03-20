import { BOSS_STATES } from "./entities.js?v=14";

const TAU = Math.PI * 2;
const DEG_TO_RAD = Math.PI / 180;

const DEFAULT_TRANSFORM = Object.freeze({
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export class ProceduralAnimator {
  constructor() {
    this.time = 0;
  }

  update(dt) {
    this.time += dt;
  }

  wave(hz, phase = 0) {
    return Math.sin(this.time * TAU * hz + phase);
  }

  getState(player) {
    if (!player) return "idle";
    if (player.hitAnimTimer > 0) return "hit";
    if (player.dashTime > 0) return "dash";
    if (player.landTimer > 0) return "land";
    if (player.wallSliding) return "wallslide";
    if (!player.onGround && player.vy < 0) return "jump_up";
    if (!player.onGround && player.vy > 0) return "fall";
    if (player.onGround && Math.abs(player.vx) > 20) return "run";
    return "idle";
  }

  getTransform(entity, state) {
    const runWave = this.wave(12);
    const idleWave = this.wave(2.5);

    switch (state) {
      case "idle":
        return {
          offsetX: 0,
          offsetY: idleWave * 1,
          scaleX: 1,
          scaleY: 1 + idleWave * 0.01,
          rotation: 0,
        };
      case "run":
        return {
          offsetX: 0,
          offsetY: runWave * 2.5,
          scaleX: 1 + runWave * 0.04,
          scaleY: 1 - runWave * 0.04,
          rotation: runWave * (3 * DEG_TO_RAD),
        };
      case "jump_up":
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 0.92,
          scaleY: 1.08,
          rotation: 0,
        };
      case "fall":
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1.06,
          scaleY: 0.94,
          rotation:
            clamp((((entity && entity.vx) || 0) / 120), -1, 1) *
            (4 * DEG_TO_RAD),
        };
      case "dash":
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1.2,
          scaleY: 0.85,
          rotation: (((entity && entity.facing) || 1) * (9 * DEG_TO_RAD)),
        };
      case "hit": {
        const pulse = this.wave(10);
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1 + pulse * 0.06,
          scaleY: 1 - pulse * 0.06,
          rotation: (Math.random() * 12 - 6) * DEG_TO_RAD,
        };
      }
      case "land":
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1.15,
          scaleY: 0.85,
          rotation: 0,
        };
      case "wallslide":
        return {
          offsetX: 0,
          offsetY: this.wave(2) * 0.5,
          scaleX: 0.98,
          scaleY: 1.02,
          rotation:
            entity && entity.touchingLeft
              ? 6 * DEG_TO_RAD
              : -6 * DEG_TO_RAD,
        };
      default:
        return DEFAULT_TRANSFORM;
    }
  }

  getEnemyTransform(enemy, targetX = null) {
    if (!enemy) return DEFAULT_TRANSFORM;

    if (enemy.type === "ninja") {
      return this.getNinjaTransform(enemy, targetX);
    }

    if (enemy.state === "dead") {
      const duration = enemy.deathDuration || 0.35;
      const progress = clamp((enemy.stateTime || 0) / duration, 0, 1);
      const scale = Math.max(0, 1 - progress);
      const spinDirection = enemy.facing < 0 ? -1 : 1;
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: scale,
        scaleY: scale,
        rotation: progress * TAU * spinDirection,
      };
    }

    if (enemy.state === "stunned") {
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: this.wave(20) * (4 * DEG_TO_RAD),
      };
    }

    if (enemy.state === "attack") {
      const target = targetX !== undefined && targetX !== null ? targetX : enemy.x;
      const dir = Math.sign(target - enemy.x) || enemy.facing || 1;
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: dir * (5 * DEG_TO_RAD),
      };
    }

    return {
      offsetX: 0,
      offsetY: this.wave(2) * 0.5,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };
  }

  getNinjaTransform(enemy, targetX = null) {
    if (enemy.state === "dead") {
      const duration = enemy.deathDuration || 0.35;
      const progress = clamp((enemy.stateTime || 0) / duration, 0, 1);
      const scale = Math.max(0, 1 - progress);
      const spinDirection = enemy.facing < 0 ? -1 : 1;
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: scale,
        scaleY: scale,
        rotation: progress * TAU * spinDirection,
      };
    }

    if (enemy.state === "stunned") {
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1 + this.wave(20) * 0.03,
        scaleY: 1 - this.wave(20) * 0.03,
        rotation: this.wave(20) * (4 * DEG_TO_RAD),
      };
    }

    if (!enemy.onGround && enemy.vy < 0) {
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: 0.92,
        scaleY: 1.08,
        rotation: clamp((enemy.vx || 0) / 220, -1, 1) * (2.5 * DEG_TO_RAD),
      };
    }

    if (!enemy.onGround && enemy.vy > 0) {
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.06,
        scaleY: 0.94,
        rotation: clamp((enemy.vx || 0) / 220, -1, 1) * (4 * DEG_TO_RAD),
      };
    }

    if (enemy.state === "attack") {
      const target = targetX !== undefined && targetX !== null ? targetX : enemy.x;
      const dir = Math.sign(target - enemy.x) || enemy.facing || 1;
      return {
        offsetX: 0,
        offsetY: 0,
        scaleX: 1.03,
        scaleY: 0.97,
        rotation: dir * (5 * DEG_TO_RAD),
      };
    }

    if (enemy.state === "run" || Math.abs(enemy.vx) > 10) {
      const runWave = this.wave(12);
      return {
        offsetX: 0,
        offsetY: runWave * 2.5,
        scaleX: 1 + runWave * 0.04,
        scaleY: 1 - runWave * 0.04,
        rotation: runWave * (3 * DEG_TO_RAD),
      };
    }

    const idleWave = this.wave(2);
    return {
      offsetX: 0,
      offsetY: idleWave * 0.5,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
    };
  }

  getBossTransform(boss, targetX = null) {
    if (!boss) return DEFAULT_TRANSFORM;

    const target = targetX !== undefined && targetX !== null ? targetX : boss.x;
    const chargeDir =
      Math.sign(target - (boss.x + boss.w / 2)) || boss.facing || -1;

    switch (boss.state) {
      case BOSS_STATES.CHARGE:
        return {
          offsetX: 0,
          offsetY: boss.chargeActive ? 0 : this.wave(6) * 0.5,
          scaleX: boss.chargeActive ? 1.15 : 1.05,
          scaleY: boss.chargeActive ? 0.92 : 0.98,
          rotation: chargeDir * (15 * DEG_TO_RAD),
        };
      case BOSS_STATES.GROUND_POUND:
        if (!boss.groundPoundJumped) {
          return {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1.06,
            scaleY: 0.9,
            rotation: 0,
          };
        }
        if (!boss.onGround || boss.vy < 0) {
          return {
            offsetX: 0,
            offsetY: 0,
            scaleX: 0.9,
            scaleY: 1.1,
            rotation: clamp((boss.vx || 0) / 240, -1, 1) * (6 * DEG_TO_RAD),
          };
        }
        return {
          offsetX: 0,
          offsetY: 1,
          scaleX: 1.2,
          scaleY: 0.8,
          rotation: 0,
        };
      case BOSS_STATES.STUNNED:
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: this.wave(12) * (3 * DEG_TO_RAD),
        };
      case BOSS_STATES.TRANSITION:
        return {
          offsetX: 0,
          offsetY: this.wave(3) * 0.5,
          scaleX: 1.03,
          scaleY: 1.03,
          rotation: this.wave(6) * (1.5 * DEG_TO_RAD),
        };
      case BOSS_STATES.DEFEATED: {
        const pulse = this.wave(10);
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1 + pulse * 0.04,
          scaleY: 1 - pulse * 0.04,
          rotation: pulse * (2 * DEG_TO_RAD),
        };
      }
      case BOSS_STATES.WALK: {
        const stomp = Math.abs(this.wave(4));
        return {
          offsetX: 0,
          offsetY: -stomp * 2,
          scaleX: 1 + stomp * 0.04,
          scaleY: 1 - stomp * 0.03,
          rotation: this.wave(4) * (2 * DEG_TO_RAD),
        };
      }
      case BOSS_STATES.SWIPE:
        return {
          offsetX: 0,
          offsetY: 0,
          scaleX: 1.04,
          scaleY: 0.98,
          rotation: (boss.facing || -1) * (8 * DEG_TO_RAD),
        };
      case BOSS_STATES.SHOOT:
        return {
          offsetX: (boss.facing || -1) * -1,
          offsetY: 0,
          scaleX: 1.02,
          scaleY: 0.98,
          rotation: (boss.facing || -1) * (6 * DEG_TO_RAD),
        };
      case BOSS_STATES.IDLE:
      default:
        return {
          offsetX: 0,
          offsetY: this.wave(2) * 1,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        };
    }
  }
}
