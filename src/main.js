import { Game } from "./game.js";
import { Input } from "./input.js";
import { loadLevel } from "./level.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });
ctx.imageSmoothingEnabled = false;

const loadingEl = document.getElementById("loading");

const input = new Input(window);
const [level, background] = await Promise.all([
  loadLevel("../levels/level1.json"),
  loadImage("../assets/background.png"),
]);

const game = new Game(canvas, ctx, input, level, { background });
loadingEl.style.display = "none";

game.start();
window.addEventListener("resize", () => game.resize());

function loadImage(path) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = path;
  });
}
