export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();
    this.buffer = [];
    this.bufferTime = 0.12;

    target.addEventListener("keydown", (event) => {
      const code = event.code;
      if (!this.down.has(code)) {
        this.pressed.add(code);
        this.buffer.push({ code, time: performance.now() });
      }
      this.down.add(code);

      if (
        code.startsWith("Arrow") ||
        code === "Space" ||
        code === "KeyZ" ||
        code === "KeyX" ||
        code === "KeyC" ||
        code === "KeyR"
      ) {
        event.preventDefault();
      }
    });

    target.addEventListener("keyup", (event) => {
      this.down.delete(event.code);
    });
  }

  isDown(code) {
    return this.down.has(code);
  }

  wasPressed(code) {
    return this.pressed.has(code);
  }

  wasBuffered(code) {
    if (this.pressed.has(code)) return true;
    const now = performance.now();
    for (let i = this.buffer.length - 1; i >= 0; i -= 1) {
      const entry = this.buffer[i];
      if (now - entry.time > this.bufferTime * 1000) break;
      if (entry.code === code) return true;
    }
    return false;
  }

  clearPressed() {
    this.pressed.clear();
    const now = performance.now();
    const cutoff = this.bufferTime * 2000;
    this.buffer = this.buffer.filter((entry) => now - entry.time < cutoff);
  }
}
