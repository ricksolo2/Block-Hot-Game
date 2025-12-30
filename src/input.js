export class Input {
  constructor(target = window) {
    this.down = new Set();
    this.pressed = new Set();

    target.addEventListener("keydown", (event) => {
      const code = event.code;
      if (!this.down.has(code)) {
        this.pressed.add(code);
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

  clearPressed() {
    this.pressed.clear();
  }
}
