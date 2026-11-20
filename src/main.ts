import { mountHelloScene } from "./render/helloScene.js";

const appEl = document.getElementById("app");
const hudEl = document.getElementById("hud-info");

if (appEl) {
  try {
    mountHelloScene(appEl, hudEl);
  } catch (error) {
    if (hudEl) {
      hudEl.textContent = `WebGL không khả dụng: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
