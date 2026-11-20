import { mountDaoDenLongGame } from "./render/gameScene.js";

const appEl = document.getElementById("app");
if (appEl) {
  try {
    mountDaoDenLongGame(appEl, {
      lanternsEl: document.getElementById("stat-lanterns"),
      flamesEl: document.getElementById("stat-flames"),
      carriedEl: document.getElementById("stat-carried"),
      timeEl: document.getElementById("stat-time"),
      scoreEl: document.getElementById("stat-score"),
      promptEl: document.getElementById("hud-prompt"),
      muteBtn: document.getElementById("btn-mute") as HTMLButtonElement | null,
      restartBtn: document.getElementById("btn-restart") as HTMLButtonElement | null,
      overlayEl: document.getElementById("overlay"),
      overlayTitleEl: document.getElementById("overlay-title"),
      overlaySubtitleEl: document.getElementById("overlay-subtitle"),
      overlayBreakdownEl: document.getElementById("overlay-breakdown"),
      replayBtn: document.getElementById("btn-replay") as HTMLButtonElement | null,
    });
  } catch (error) {
    const promptEl = document.getElementById("hud-prompt");
    if (promptEl) {
      promptEl.textContent = `WebGL không khả dụng: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
