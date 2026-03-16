export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function randItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

export class HitStop {
  constructor() {
    this.active = false;
    this.timer = 0;
  }

  trigger(duration) {
    this.active = true;
    this.timer = Math.max(this.timer, duration);
  }

  update(dt) {
    if (!this.active) return false;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.active = false;
      this.timer = 0;
    }
    return true;
  }

  reset() {
    this.active = false;
    this.timer = 0;
  }
}

export class FloatingText {
  constructor() {
    this.texts = [];
  }

  add(text, x, y, color = "#ffffff", size = 9, duration = 0.7) {
    this.texts.push({
      text,
      x,
      y,
      color,
      size,
      duration,
      timer: duration,
      vy: -46,
    });
  }

  update(dt) {
    for (let i = this.texts.length - 1; i >= 0; i -= 1) {
      const text = this.texts[i];
      text.timer -= dt;
      text.y += text.vy * dt;
      text.vy *= 0.94;
      if (text.timer <= 0) {
        this.texts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    for (const text of this.texts) {
      const alpha = clamp(text.timer / text.duration, 0, 1);
      const scale = 1 + (1 - alpha) * 0.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `bold ${Math.round(text.size * scale)}px monospace`;
      ctx.fillStyle = "#0b0b0b";
      ctx.fillText(text.text, text.x + 1, text.y + 1);
      ctx.fillStyle = text.color;
      ctx.fillText(text.text, text.x, text.y);
      ctx.restore();
    }
  }

  clear() {
    this.texts = [];
  }
}
