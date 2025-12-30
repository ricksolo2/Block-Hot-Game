import { CONFIG, PELLETS } from "./constants.js";
import { clamp } from "./utils.js";

export function drawHud(ctx, game) {
  ctx.save();
  ctx.fillStyle = "#e6e6e6";
  ctx.font = "9px monospace";
  ctx.textBaseline = "top";

  if (game.state === "menu") {
    drawMenu(ctx);
    ctx.restore();
    return;
  }

  if (game.state === "instructions") {
    drawInstructions(ctx);
    ctx.restore();
    return;
  }

  if (game.state === "complete") {
    drawComplete(ctx);
    ctx.restore();
    return;
  }

  if (game.state === "gameover") {
    drawGameOver(ctx);
    ctx.restore();
    return;
  }

  drawHudPanels(ctx);
  drawHealth(ctx, game);
  drawHeat(ctx, game);
  drawCombo(ctx, game);
  drawCoinScore(ctx, game);
  drawWeapon(ctx, game);
  drawControlsBox(ctx);
  drawHints(ctx, game);
  drawBustPrompt(ctx, game);

  ctx.restore();
}

function drawHealth(ctx, game) {
  const { player } = game;
  const x = 8;
  const y = 8;
  const heartScale = 2;
  const heartW = 8 * heartScale;
  const gap = 3;

  for (let i = 0; i < player.maxHp; i += 1) {
    drawHeart(
      ctx,
      x + i * (heartW + gap),
      y,
      heartScale,
      i < player.hp
    );
  }
}

function drawHeat(ctx, game) {
  const stars = game.heatStars;
  const size = 8;
  const gap = 3;
  const totalWidth = CONFIG.maxHeatStars * (size + gap) - gap;
  const x = (CONFIG.width - totalWidth) / 2;
  const y = 6;

  for (let i = 0; i < CONFIG.maxHeatStars; i += 1) {
    const sx = x + i * (size + gap);
    if (i < stars) {
      ctx.fillStyle = "#f2d64b";
      ctx.fillRect(sx, y, size, size);
    } else {
      ctx.strokeStyle = "#5a5a5a";
      ctx.strokeRect(sx, y, size, size);
    }
  }

  const thresholds = CONFIG.heatThresholds;
  const prev = stars === 0 ? 0 : thresholds[stars - 1];
  const next = thresholds[stars] || thresholds[thresholds.length - 1] + 20;
  const ratio = stars >= CONFIG.maxHeatStars ? 1 : (game.heatPoints - prev) / (next - prev);
  const barW = 60;
  const barH = 4;
  const barX = (CONFIG.width - barW) / 2;
  const barY = y + size + 4;

  ctx.fillStyle = "#2f2f2f";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#f2d64b";
  ctx.fillRect(barX, barY, barW * clamp(ratio, 0, 1), barH);
}

function drawCombo(ctx, game) {
  const text = `Combo x${game.combo}`;
  const textWidth = ctx.measureText(text).width;
  const x = (CONFIG.width - textWidth) / 2;
  const y = 24;

  drawText(ctx, text, x, y, game.combo > 1 ? "#7fd8ff" : "#8a8a8a");

  const barW = 80;
  const barH = 4;
  const barX = (CONFIG.width - barW) / 2;
  const barY = y + 12;
  const ratio = game.comboTimer / game.comboMaxTime;

  ctx.fillStyle = "#2f2f2f";
  ctx.fillRect(barX, barY, barW, barH);
  ctx.fillStyle = "#7fd8ff";
  ctx.fillRect(barX, barY, barW * clamp(ratio, 0, 1), barH);
}

function drawCoinScore(ctx, game) {
  const y = 8;
  const countText = `${game.coinCount}`;
  const countWidth = ctx.measureText(countText).width;
  const iconWidth = 6 * 2 + 4;
  const blockWidth = iconWidth + countWidth + 4;
  const x = CONFIG.width - blockWidth - 8;

  drawCoin(ctx, x, y + 2, 6);
  drawText(ctx, countText, x + iconWidth, y, "#f7f1cf");

  const scoreText = `Score: ${game.score}`;
  const scoreWidth = ctx.measureText(scoreText).width;
  drawText(
    ctx,
    scoreText,
    CONFIG.width - scoreWidth - 8,
    y + 12,
    "#f7f1cf"
  );
}

function drawWeapon(ctx, game) {
  const pellet = PELLETS[game.player.pelletIndex];
  const ammoText =
    game.player.reloadTimer > 0
      ? "Reloading"
      : `${game.player.ammo}/${game.player.maxAmmo}`;
  const nameText = `${pellet.name} Pellets`;
  const ammoLine = `Ammo: ${ammoText}`;
  const x = 8;
  const y = CONFIG.height - 22;

  drawText(ctx, nameText, x, y, pellet.color);
  drawText(ctx, ammoLine, x, y + 10, "#e6e6e6");
}

function drawHints(ctx, game) {
  drawText(ctx, "Press I for Instructions", 8, CONFIG.height - 36, "#cfd4d8");
}

function drawBustPrompt(ctx, game) {
  if (!game.bust.active) return;
  const text = "BUST! Mash Z/Arrows to break free";
  const w = ctx.measureText(text).width;
  drawText(ctx, text, (CONFIG.width - w) / 2, CONFIG.height / 2 - 6, "#ffd08a");
}

function drawMenu(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = "#7fd8ff";
  ctx.font = "14px monospace";
  const title = "BlockHot";
  const titleW = ctx.measureText(title).width;
  drawText(ctx, title, (CONFIG.width - titleW) / 2, 40, "#7fd8ff");

  ctx.font = "9px monospace";
  const start = "Press Enter to Start";
  const instr = "Press I for Instructions";
  drawText(
    ctx,
    start,
    (CONFIG.width - ctx.measureText(start).width) / 2,
    80,
    "#e6e6e6"
  );
  drawText(
    ctx,
    instr,
    (CONFIG.width - ctx.measureText(instr).width) / 2,
    96,
    "#e6e6e6"
  );
}

function drawInstructions(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.font = "12px monospace";
  const title = "Instructions";
  drawText(ctx, title, 8, 12, "#7fd8ff");

  ctx.font = "9px monospace";
  drawText(ctx, "Move: WASD / Arrows", 8, 32, "#e6e6e6");
  drawText(ctx, "Jump: Z or Space", 8, 44, "#e6e6e6");
  drawText(ctx, "Shoot: X   Dash: C   Reload: R", 8, 56, "#e6e6e6");
  drawText(ctx, "Swap Pellets: Q / E or 1-4", 8, 68, "#e6e6e6");
  drawText(ctx, "Goal: Reach the exit, earn coins, manage Heat.", 8, 84, "#e6e6e6");
  drawText(ctx, "Cops raise Heat; safehouses cool it down.", 8, 96, "#e6e6e6");
  drawText(ctx, "Press Enter to Start or Esc to go Back", 8, 116, "#e6e6e6");
}

function drawComplete(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  const text = "Level Complete - Press Enter to restart";
  const w = ctx.measureText(text).width;
  drawText(ctx, text, (CONFIG.width - w) / 2, CONFIG.height / 2 - 6, "#7fd8ff");
}

function drawGameOver(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  const text = "Game Over - Press Enter to restart";
  const w = ctx.measureText(text).width;
  drawText(ctx, text, (CONFIG.width - w) / 2, CONFIG.height / 2 - 6, "#ff8a8a");
}

function drawControlsBox(ctx) {
  const boxW = 120;
  const boxH = 44;
  const x = CONFIG.width - boxW - 6;
  const y = CONFIG.height - boxH - 6;

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = "#3a3a3a";
  ctx.strokeRect(x, y, boxW, boxH);

  drawText(ctx, "Move: WASD/Arrows", x + 6, y + 6, "#e6e6e6");
  drawText(ctx, "Jump: Z  Shoot: X", x + 6, y + 18, "#e6e6e6");
  drawText(ctx, "Dash: C  Reload: R", x + 6, y + 30, "#e6e6e6");
  drawText(ctx, "Swap: Q/E", x + 6, y + 40, "#e6e6e6");
}

function drawHudPanels(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, CONFIG.width, 30);
  ctx.fillRect(0, CONFIG.height - 18, CONFIG.width, 18);
}

function drawHeart(ctx, x, y, scale, filled) {
  const pattern = [
    "01100110",
    "11111111",
    "11111111",
    "11111111",
    "01111110",
    "00111100",
    "00011000"
  ];
  ctx.fillStyle = filled ? "#e65050" : "#3a2b2b";

  for (let row = 0; row < pattern.length; row += 1) {
    for (let col = 0; col < pattern[row].length; col += 1) {
      if (pattern[row][col] === "1") {
        ctx.fillRect(x + col * scale, y + row * scale, scale, scale);
      }
    }
  }
}

function drawCoin(ctx, x, y, r) {
  ctx.fillStyle = "#0b0b0b";
  ctx.beginPath();
  ctx.arc(x + r, y + r, r + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f2d64b";
  ctx.beginPath();
  ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffd965";
  ctx.fillRect(x + r - 2, y + 2, 4, r * 2 - 4);
}

function drawText(ctx, text, x, y, color) {
  ctx.fillStyle = "#0b0b0b";
  ctx.fillText(text, x + 1, y + 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
