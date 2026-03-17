import { CONFIG, PELLETS } from "./constants.js?v=6";
import { clamp } from "./utils.js?v=5";

export function drawHud(ctx, game) {
  ctx.save();
  ctx.fillStyle = "#e6e6e6";
  ctx.font = "9px monospace";
  ctx.textBaseline = "top";

  if (game.state === "menu") {
    drawMenu(ctx, game);
    ctx.restore();
    return;
  }

  if (game.state === "instructions") {
    drawInstructions(ctx, game);
    ctx.restore();
    return;
  }

  if (game.state === "complete") {
    drawComplete(ctx, game);
    ctx.restore();
    return;
  }

  if (game.state === "gameover") {
    drawGameOver(ctx);
    ctx.restore();
    return;
  }

  if (game.state === "paused") {
    drawPaused(ctx, game);
    ctx.restore();
    return;
  }

  if (game.state === "cutscene") {
    drawCutscene(ctx, game);
    ctx.restore();
    return;
  }

  drawHudPanels(ctx);
  drawHealth(ctx, game);
  drawHeat(ctx, game);
  drawCombo(ctx, game);
  drawCoinScore(ctx, game);
  drawObjectives(ctx, game);
  drawAudioStatus(ctx, game);
  drawWeapon(ctx, game);
  drawControlsBox(ctx);
  drawHints(ctx, game);
  drawBustPrompt(ctx, game);
  drawBossHud(ctx, game);

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
  const bossOffset = hasBossOverlay(game) ? 34 : 0;
  const stars = game.heatStars;
  const size = 8;
  const gap = 3;
  const totalWidth = CONFIG.maxHeatStars * (size + gap) - gap;
  const x = (CONFIG.width - totalWidth) / 2;
  const y = 6 + bossOffset;

  for (let i = 0; i < CONFIG.maxHeatStars; i += 1) {
    const sx = x + i * (size + gap);
    const cx = sx + size / 2;
    const cy = y + size / 2;
    if (i < stars) {
      drawStar(ctx, cx, cy, size / 2, size / 4, "#f2d64b", "#d0b84b");
    } else {
      drawStar(ctx, cx, cy, size / 2, size / 4, null, "#5a5a5a");
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
  const bossOffset = hasBossOverlay(game) ? 34 : 0;
  const text = `Combo x${game.combo}`;
  const textWidth = ctx.measureText(text).width;
  const x = (CONFIG.width - textWidth) / 2;
  const y = 24 + bossOffset;

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
  const coinRadius = 4;
  const iconWidth = coinRadius * 2 + 4;
  const blockWidth = iconWidth + countWidth + 4;
  const x = CONFIG.width - blockWidth - 8;

  drawCoin(ctx, x, y + 1, coinRadius);
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

function drawObjectives(ctx, game) {
  const requiredSwatKills = game.level?.requiredSwatKills || 0;
  if (!requiredSwatKills) return;

  const text = `SWAT: ${game.swatKills}/${requiredSwatKills}`;
  const width = ctx.measureText(text).width;
  drawText(ctx, text, CONFIG.width - width - 8, 28, "#8ec8ff");
}

function drawAudioStatus(ctx, game) {
  const state = game.audioState;
  if (!state) return;
  ctx.save();
  ctx.font = "8px monospace";
  const label =
    state.muted || state.volume === 0
      ? "Audio Muted (M)"
      : "Audio: M  -/+ Vol";
  const w = ctx.measureText(label).width + 8;
  const x = 8;
  const y = 22;
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(x, y - 2, w, 10);
  ctx.strokeStyle = "#3a3a3a";
  ctx.strokeRect(x, y - 2, w, 10);
  drawText(ctx, label, x + 4, y, state.muted ? "#ffb3b3" : "#f7f1cf");
  ctx.restore();
}

function drawWeapon(ctx, game) {
  const pellet = PELLETS[game.player.pelletIndex];
  const tripleText =
    game.player.tripleShotTimer > 0
      ? `  Triple: ${Math.ceil(game.player.tripleShotTimer)}s`
      : "";
  const ammoText =
    game.player.reloadTimer > 0
      ? "Reloading"
      : `${game.player.ammo}/${game.player.maxAmmo}`;
  const nameText = `${pellet.name} Pellets`;
  const ammoLine = `Ammo: ${ammoText}${tripleText}`;
  const x = 8;
  const y = CONFIG.height - 22;

  drawText(ctx, nameText, x, y, pellet.color);
  drawText(ctx, ammoLine, x, y + 10, "#e6e6e6");
}

function drawHints(ctx, game) {
  const barrier = game.getNearbyBarrier ? game.getNearbyBarrier() : null;
  if (barrier) {
    const text = barrier.hint || "Red pellets break police tape";
    const w = ctx.measureText(text).width;
    drawText(
      ctx,
      text,
      (CONFIG.width - w) / 2,
      CONFIG.height - 34,
      "#ffe277"
    );
    return;
  }

  if (game.player.onGround && game.player.surfaceType === "wet") {
    const text = "Wet ground is slippery";
    const w = ctx.measureText(text).width;
    drawText(
      ctx,
      text,
      (CONFIG.width - w) / 2,
      CONFIG.height - 34,
      "#8ed6ff"
    );
    return;
  }

  const shortage = game.getExitCoinShortage ? game.getExitCoinShortage() : 0;
  const swatShortage = game.getExitSwatShortage ? game.getExitSwatShortage() : 0;
  if (shortage > 0 || swatShortage > 0) {
    const needs = [];
    if (shortage > 0) {
      needs.push(`${shortage} more coin${shortage === 1 ? "" : "s"}`);
    }
    if (swatShortage > 0) {
      needs.push(`${swatShortage} more SWAT takedown${swatShortage === 1 ? "" : "s"}`);
    }
    const text = `Need ${needs.join(" and ")} to exit`;
    const w = ctx.measureText(text).width;
    drawText(
      ctx,
      text,
      (CONFIG.width - w) / 2,
      CONFIG.height - 34,
      "#ffd08a"
    );
  }
}

function drawBustPrompt(ctx, game) {
  if (!game.bust.active) return;
  const text = "BUST! Mash Z/Arrows to break free";
  const w = ctx.measureText(text).width;
  drawText(ctx, text, (CONFIG.width - w) / 2, CONFIG.height / 2 - 6, "#ffd08a");
}

function drawCutscene(ctx, game) {
  const t = game.cutsceneTimer || 0;

  if (t >= 2) {
    const fadeIn = clamp((t - 2) / 2, 0, 1);
    ctx.fillStyle = `rgba(148, 52, 24, ${0.14 * fadeIn})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  const blackAlpha = t < 2 ? 1 : 1 - clamp((t - 2) / 2, 0, 1);
  if (blackAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${blackAlpha})`;
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  }

  if (t < 2.2) {
    const fade =
      t < 0.5 ? clamp(t / 0.5, 0, 1) : clamp((2 - t) / 0.5, 0, 1);
    ctx.fillStyle = `rgba(255, 255, 255, ${fade})`;
    ctx.font = "bold 22px monospace";
    ctx.textAlign = "center";
    ctx.fillText("END OF THE LINE.", CONFIG.width / 2, CONFIG.height / 2 - 12);
    ctx.textAlign = "left";
    ctx.font = "9px monospace";
  }

  if (t >= 6 && t < 7.5) {
    drawBossNameCard(ctx, t);
  }

  if (t >= 7.5 && game.boss) {
    drawBossHealthBar(ctx, game, clamp((t - 7.5) / 0.5, 0, 1));
  }
}

function drawBossHud(ctx, game) {
  if (!game.boss || !game.bossVisible) return;
  if (game.state !== "bossfight" && !game.bossDefeatActive) return;

  drawBossHealthBar(ctx, game, 1);

  if (game.boss?.state === "transition") {
    const text =
      game.boss.phase === 2
        ? "THE ENFORCER is getting serious..."
        : "THE ENFORCER has entered Phase 3";
    const width = ctx.measureText(text).width;
    drawText(ctx, text, (CONFIG.width - width) / 2, 54, "#ffb08a");
  }

  if (game.bossDefeatActive && game.bossDefeatTimer >= 3 && game.bossDefeatTimer < 6) {
    const text = "THE ENFORCER HAS BEEN NEUTRALIZED";
    ctx.font = "bold 14px monospace";
    const width = ctx.measureText(text).width;
    drawText(ctx, text, (CONFIG.width - width) / 2, 72, "#ffe7b5");
    ctx.font = "9px monospace";
  }
}

function drawBossHealthBar(ctx, game, dropProgress = 1) {
  const boss = game.boss;
  if (!boss) return;

  const width = 380;
  const height = 16;
  const x = (CONFIG.width - width) / 2;
  const y = Math.round(-32 + 40 * clamp(dropProgress, 0, 1));
  const ratio = clamp(game.bossDisplayHp / boss.maxHp, 0, 1);
  const hpWidth = Math.round((width - 4) * ratio);
  const lowPulse = (Math.sin(game.time * 10) + 1) * 0.5;
  const label = "THE ENFORCER";

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(x - 4, y - 14, width + 8, height + 22);
  ctx.strokeStyle = "#f0e7d4";
  ctx.strokeRect(x - 4, y - 14, width + 8, height + 22);

  ctx.font = "bold 12px monospace";
  const labelWidth = ctx.measureText(label).width;
  drawText(ctx, label, (CONFIG.width - labelWidth) / 2, y - 11, "#f7f1cf");
  ctx.font = "9px monospace";

  ctx.fillStyle = "#1b0a0a";
  ctx.fillRect(x, y, width, height);

  const gradient = ctx.createLinearGradient(x, y, x + width, y);
  if (ratio > 0.66) {
    gradient.addColorStop(0, "#7c0f16");
    gradient.addColorStop(1, "#d73d49");
  } else if (ratio > 0.33) {
    gradient.addColorStop(0, "#a63c10");
    gradient.addColorStop(1, "#f08a2a");
  } else {
    const pulse = 0.35 + lowPulse * 0.35;
    gradient.addColorStop(0, `rgba(120, 10, 10, ${0.9})`);
    gradient.addColorStop(1, `rgba(255, 60, 60, ${0.75 + pulse * 0.25})`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(x + 2, y + 2, hpWidth, height - 4);

  if (game.bossHpFlashTimer > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${clamp(game.bossHpFlashTimer / 0.14, 0, 1) * 0.6})`;
    ctx.fillRect(x + 2, y + 2, hpWidth, height - 4);
  }

  ctx.strokeStyle = "#f0e7d4";
  ctx.strokeRect(x, y, width, height);
}

function drawBossNameCard(ctx, time) {
  const panelW = 250;
  const panelH = 34;
  const centerX = (CONFIG.width - panelW) / 2;
  let x = centerX;

  if (time < 6.3) {
    x = CONFIG.width + 20 - clamp((time - 6) / 0.3, 0, 1) * (CONFIG.width - centerX + 20);
  } else if (time > 7.2) {
    x = centerX - clamp((time - 7.2) / 0.3, 0, 1) * (centerX + panelW + 20);
  }

  const y = 42;
  ctx.fillStyle = "rgba(140, 18, 18, 0.92)";
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeStyle = "#f7f1cf";
  ctx.strokeRect(x, y, panelW, panelH);
  ctx.font = "bold 13px monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("THE ENFORCER", x + panelW / 2, y + 11);
  ctx.textAlign = "left";
  ctx.font = "9px monospace";
}

function hasBossOverlay(game) {
  return !!(game.boss && game.bossVisible && (game.state === "bossfight" || game.bossDefeatActive));
}

function drawMenu(ctx, game) {
  drawMenuBackground(ctx, game);

  const panelW = 240;
  const panelH = 60;
  const panelX = (CONFIG.width - panelW) / 2;
  const panelY = (CONFIG.height - panelH) / 2 + 6;
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  ctx.strokeStyle = "#3a3a3a";
  ctx.strokeRect(panelX, panelY, panelW, panelH);

  ctx.font = "18px monospace";
  const start = "Press Enter to Start";
  const centerY = panelY + 16;
  drawText(
    ctx,
    start,
    (CONFIG.width - ctx.measureText(start).width) / 2,
    centerY,
    "#e6e6e6"
  );

  ctx.font = "10px monospace";
  const instructions = "Game Instructions (Press I)";
  drawText(
    ctx,
    instructions,
    (CONFIG.width - ctx.measureText(instructions).width) / 2,
    centerY + 18,
    "#f7f1cf"
  );
}

function drawInstructions(ctx, game) {
  drawMenuBackground(ctx, game);

  ctx.font = "12px monospace";
  const title = "Game Instructions";
  drawText(ctx, title, 8, 12, "#7fd8ff");

  ctx.font = "9px monospace";
  const requiredCoins =
    game.level?.minCoinsToExit ?? CONFIG.minCoinsToExit;
  const requiredSwatKills = game.level?.requiredSwatKills || 0;
  drawText(ctx, "Move: WASD / Arrows", 8, 32, "#e6e6e6");
  drawText(ctx, "Jump: Z or Space", 8, 44, "#e6e6e6");
  drawText(ctx, "Shoot: X   Dash: C   Reload: R", 8, 56, "#e6e6e6");
  drawText(ctx, "Swap Pellets: Q / E or 1-4", 8, 68, "#e6e6e6");
  drawText(ctx, "Audio: M Mute, -/+ Volume", 8, 80, "#e6e6e6");
  drawText(ctx, "Goal: Reach the exit, earn coins, manage Heat.", 8, 96, "#e6e6e6");
  drawText(
    ctx,
    requiredSwatKills > 0
      ? `Need ${requiredCoins} coins and ${requiredSwatKills} SWAT takedowns to exit.`
      : `Need at least ${requiredCoins} coins to exit.`,
    8,
    108,
    "#e6e6e6"
  );
  drawText(ctx, "Gun pickup grants temporary triple-shot spread.", 8, 120, "#e6e6e6");
  drawText(ctx, "Health pickup repairs missing hearts.", 8, 132, "#e6e6e6");
  drawText(ctx, "Cops raise Heat; safehouses cool it down.", 8, 144, "#e6e6e6");
  drawText(ctx, "Press Enter to Start or Esc to go Back", 8, 156, "#e6e6e6");
}

function drawComplete(ctx, game) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  const stats = game.completeStats || {
    coins: game.coinCount,
    score: game.score,
    level: game.levelIndex + 1,
  };
  const title = stats.level ? `Level ${stats.level} Complete` : "Level Complete";
  ctx.font = "14px monospace";
  const titleW = ctx.measureText(title).width;
  drawText(ctx, title, (CONFIG.width - titleW) / 2, CONFIG.height / 2 - 20, "#7fd8ff");

  ctx.font = "10px monospace";
  const coinsText = `Coins: ${stats.coins}`;
  const swatText =
    typeof stats.requiredSwatKills === "number" && stats.requiredSwatKills > 0
      ? `SWAT: ${stats.swatKills}/${stats.requiredSwatKills}`
      : "";
  const scoreText = `Score: ${stats.score}`;
  const coinsW = ctx.measureText(coinsText).width;
  const swatW = swatText ? ctx.measureText(swatText).width : 0;
  const scoreW = ctx.measureText(scoreText).width;
  drawText(ctx, coinsText, (CONFIG.width - coinsW) / 2, CONFIG.height / 2 - 4, "#f7f1cf");
  if (swatText) {
    drawText(ctx, swatText, (CONFIG.width - swatW) / 2, CONFIG.height / 2 + 8, "#8ec8ff");
  }
  drawText(
    ctx,
    scoreText,
    (CONFIG.width - scoreW) / 2,
    CONFIG.height / 2 + (swatText ? 20 : 8),
    "#f7f1cf"
  );

  const nextText = game.hasNextLevel() ? "Enter -> Next Level" : "Enter: Restart";
  const homeText = "Esc: Home";
  const nextW = ctx.measureText(nextText).width;
  const homeW = ctx.measureText(homeText).width;
  const controlsY = CONFIG.height / 2 + (swatText ? 36 : 24);
  drawText(ctx, nextText, (CONFIG.width - nextW) / 2, controlsY, "#e6e6e6");
  drawText(ctx, homeText, (CONFIG.width - homeW) / 2, controlsY + 12, "#e6e6e6");
}

function drawGameOver(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  const text = "Game Over";
  const w = ctx.measureText(text).width;
  drawText(ctx, text, (CONFIG.width - w) / 2, CONFIG.height / 2 - 12, "#ff8a8a");
  const hint = "Enter: Restart   Esc: Home";
  const hintW = ctx.measureText(hint).width;
  drawText(ctx, hint, (CONFIG.width - hintW) / 2, CONFIG.height / 2 + 4, "#e6e6e6");
}

function drawPaused(ctx, game) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  const timeLeft = Math.ceil(game.pauseTimer);
  const text = `Paused - Returning to menu in ${timeLeft}s`;
  const w = ctx.measureText(text).width;
  drawText(ctx, text, (CONFIG.width - w) / 2, CONFIG.height / 2 - 6, "#ffd08a");
  const hint = "Press P or Esc to resume";
  const hintW = ctx.measureText(hint).width;
  drawText(ctx, hint, (CONFIG.width - hintW) / 2, CONFIG.height / 2 + 6, "#e6e6e6");
}

function drawMenuBackground(ctx, game) {
  if (!game.menuImage) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
    return;
  }

  ctx.fillStyle = "#0c0c0c";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  const scale = Math.min(
    CONFIG.width / game.menuImage.width,
    CONFIG.height / game.menuImage.height
  );
  const drawW = game.menuImage.width * scale;
  const drawH = game.menuImage.height * scale;
  const drawX = (CONFIG.width - drawW) / 2;
  const drawY = (CONFIG.height - drawH) / 2;

  ctx.drawImage(game.menuImage, drawX, drawY, drawW, drawH);
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
}

function drawControlsBox(ctx) {
  const boxW = 108;
  const boxH = 36;
  const x = CONFIG.width - boxW - 6;
  const y = CONFIG.height - boxH - 6;

  ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
  ctx.fillRect(x, y, boxW, boxH);
  ctx.strokeStyle = "#3a3a3a";
  ctx.strokeRect(x, y, boxW, boxH);

  ctx.save();
  ctx.font = "8px monospace";
  drawText(ctx, "Move: WASD/Arrows", x + 6, y + 4, "#e6e6e6");
  drawText(ctx, "Jump: Z  Shoot: X", x + 6, y + 12, "#e6e6e6");
  drawText(ctx, "Dash: C  Reload: R", x + 6, y + 20, "#e6e6e6");
  drawText(ctx, "Swap: Q/E", x + 6, y + 28, "#e6e6e6");
  ctx.restore();
}

function drawHudPanels(ctx) {
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, CONFIG.width, 34);
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

function drawStar(ctx, cx, cy, outerRadius, innerRadius, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + i * (Math.PI * 2) / 5;
    const x = cx + Math.cos(angle) * outerRadius;
    const y = cy + Math.sin(angle) * outerRadius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    const innerAngle = angle + Math.PI / 5;
    ctx.lineTo(
      cx + Math.cos(innerAngle) * innerRadius,
      cy + Math.sin(innerAngle) * innerRadius
    );
  }
  ctx.closePath();

  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.stroke();
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
