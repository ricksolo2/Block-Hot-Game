import { CONFIG } from "./constants.js";

export class Level {
  constructor(data) {
    this.tileSize = data.tileSize || CONFIG.tileSize;
    this.legend = data.legend || { "#": 1, "-": 2, "!": 3 };
    this.tiles = this.parseTiles(data.tiles || []);
    this.height = this.tiles.length;
    this.width = this.tiles[0] ? this.tiles[0].length : 0;

    const spawns = data.spawns || {};
    this.playerSpawn = resolvePoint(spawns.player, this.tileSize, false);
    this.copSpawns = (spawns.cops || []).map((spawn) =>
      resolveSpawn(spawn, this.tileSize)
    );
    this.snakeSpawns = (spawns.snakes || []).map((spawn) =>
      resolveSpawn(spawn, this.tileSize)
    );
    this.ninjaSpawns = (spawns.ninjas || []).map((spawn) =>
      resolveSpawn(spawn, this.tileSize)
    );

    this.coins = (data.coins || []).map((coin) => {
      const point = resolvePoint(coin, this.tileSize, true);
      return {
        x: point.x,
        y: point.y,
        r: 4,
        collected: false,
      };
    });

    this.safehouses = (data.safehouses || []).map((rect) =>
      resolveRect(rect, this.tileSize)
    );
    this.exit = resolveRect(data.exit, this.tileSize);
    this.grassZones = (data.grass || []).map((rect) =>
      resolveRect(rect, this.tileSize)
    );
  }

  parseTiles(rows) {
    return rows.map((row) => {
      const chars = row.split("");
      return chars.map((char) => this.legend[char] || 0);
    });
  }

  getTile(tx, ty) {
    if (ty < 0) return 1;
    if (tx < 0 || tx >= this.width) return 1;
    if (ty >= this.height) return 0;
    return this.tiles[ty][tx];
  }

  isSolidTile(tile) {
    return tile === 1 || tile === 3;
  }

  isPlatformTile(tile) {
    return tile === 2;
  }

  isHazardTile(tile) {
    return tile === 3;
  }

  tilesInRect(rect) {
    const { x, y, w, h } = rect;
    const startX = Math.floor(x / this.tileSize);
    const endX = Math.floor((x + w - 1) / this.tileSize);
    const startY = Math.floor(y / this.tileSize);
    const endY = Math.floor((y + h - 1) / this.tileSize);
    const tiles = [];

    for (let ty = startY; ty <= endY; ty += 1) {
      for (let tx = startX; tx <= endX; tx += 1) {
        const type = this.getTile(tx, ty);
        tiles.push({ tx, ty, type });
      }
    }

    return tiles;
  }

  isInGrass(rect) {
    for (const zone of this.grassZones) {
      if (
        rect.x < zone.x + zone.w &&
        rect.x + rect.w > zone.x &&
        rect.y < zone.y + zone.h &&
        rect.y + rect.h > zone.y
      ) {
        return true;
      }
    }
    return false;
  }

  moveEntity(entity, dt, allowPlatforms = true) {
    entity.onGround = false;
    entity.onPlatform = false;
    entity.touchingLeft = false;
    entity.touchingRight = false;

    if (entity.vx !== 0) {
      const nextX = entity.x + entity.vx * dt;
      const dir = Math.sign(entity.vx);
      const edgeX = dir > 0 ? nextX + entity.w : nextX;
      const startY = Math.floor(entity.y / this.tileSize);
      const endY = Math.floor((entity.y + entity.h - 1) / this.tileSize);
      let hit = false;

      for (let ty = startY; ty <= endY; ty += 1) {
        const tx = Math.floor(edgeX / this.tileSize);
        const tile = this.getTile(tx, ty);
        if (this.isSolidTile(tile)) {
          hit = true;
          if (dir > 0) {
            entity.x = tx * this.tileSize - entity.w;
            entity.touchingRight = true;
          } else {
            entity.x = (tx + 1) * this.tileSize;
            entity.touchingLeft = true;
          }
          entity.vx = 0;
          break;
        }
      }

      if (!hit) {
        entity.x = nextX;
      }
    }

    if (entity.vy !== 0) {
      const nextY = entity.y + entity.vy * dt;
      const dir = Math.sign(entity.vy);
      const edgeY = dir > 0 ? nextY + entity.h : nextY;
      const startX = Math.floor(entity.x / this.tileSize);
      const endX = Math.floor((entity.x + entity.w - 1) / this.tileSize);
      const prevBottom = entity.y + entity.h;
      let hit = false;

      for (let tx = startX; tx <= endX; tx += 1) {
        const ty = Math.floor(edgeY / this.tileSize);
        const tile = this.getTile(tx, ty);
        const isSolid = this.isSolidTile(tile);
        const platformTop = ty * this.tileSize + this.tileSize - 4;
        const isPlatform =
          allowPlatforms &&
          this.isPlatformTile(tile) &&
          dir > 0 &&
          prevBottom <= platformTop &&
          !entity.dropThrough;

        if (isSolid || isPlatform) {
          hit = true;
          if (dir > 0) {
            if (isPlatform) {
              entity.y = platformTop - entity.h;
            } else {
              entity.y = ty * this.tileSize - entity.h;
            }
            entity.onGround = true;
            entity.onPlatform = isPlatform;
          } else {
            entity.y = (ty + 1) * this.tileSize;
          }
          entity.vy = 0;
          break;
        }
      }

      if (!hit) {
        entity.y = nextY;
      }
    }
  }

  draw(ctx, camera) {
    const startX = Math.max(0, Math.floor(camera.x / this.tileSize));
    const endX = Math.min(
      this.width - 1,
      Math.floor((camera.x + camera.w) / this.tileSize)
    );
    const startY = Math.max(0, Math.floor(camera.y / this.tileSize));
    const endY = Math.min(
      this.height - 1,
      Math.floor((camera.y + camera.h) / this.tileSize)
    );

    for (let ty = startY; ty <= endY; ty += 1) {
      for (let tx = startX; tx <= endX; tx += 1) {
        const tile = this.tiles[ty][tx];
        if (tile === 0) continue;

        const x = tx * this.tileSize;
        const y = ty * this.tileSize;

        if (tile === 1) {
          ctx.fillStyle = "#404040";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.fillStyle = "#5a5a5a";
          ctx.fillRect(x, y, this.tileSize, 2);
        } else if (tile === 2) {
          ctx.fillStyle = "#b6793a";
          ctx.fillRect(x, y + this.tileSize - 4, this.tileSize, 4);
          ctx.fillStyle = "#d9a160";
          ctx.fillRect(x, y + this.tileSize - 6, this.tileSize, 2);
        } else if (tile === 3) {
          ctx.fillStyle = "#d35454";
          ctx.fillRect(x, y, this.tileSize, this.tileSize);
          ctx.fillStyle = "#ff9d9d";
          ctx.fillRect(x + 2, y + 2, this.tileSize - 4, 4);
        }
      }
    }

    if (this.grassZones.length > 0) {
      ctx.fillStyle = "#245a2f";
      for (const zone of this.grassZones) {
        ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
        ctx.fillStyle = "#3d8b4b";
        ctx.fillRect(zone.x, zone.y, zone.w, 3);
        ctx.fillStyle = "#245a2f";
      }
    }
  }
}

export async function loadLevel(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load level: ${path}`);
  }
  const data = await response.json();
  return new Level(data);
}

function resolvePoint(point, tileSize, center) {
  if (!point) {
    return { x: 0, y: 0 };
  }
  if (typeof point.tx === "number" && typeof point.ty === "number") {
    return {
      x: (point.tx + (center ? 0.5 : 0)) * tileSize,
      y: (point.ty + (center ? 0.5 : 0)) * tileSize,
    };
  }
  return { x: point.x || 0, y: point.y || 0 };
}

function resolveRect(rect, tileSize) {
  if (!rect) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  if (typeof rect.tx === "number" && typeof rect.ty === "number") {
    const tw = rect.tw || rect.w || 1;
    const th = rect.th || rect.h || 1;
    return {
      x: rect.tx * tileSize,
      y: rect.ty * tileSize,
      w: tw * tileSize,
      h: th * tileSize,
    };
  }
  return { x: rect.x || 0, y: rect.y || 0, w: rect.w || 0, h: rect.h || 0 };
}

function resolveSpawn(spawn, tileSize) {
  if (!spawn) {
    return { x: 0, y: 0 };
  }
  const point = resolvePoint(spawn, tileSize, false);
  return { ...spawn, x: point.x, y: point.y };
}
