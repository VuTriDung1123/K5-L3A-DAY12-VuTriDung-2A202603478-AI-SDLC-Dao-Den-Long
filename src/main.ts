import type { NightNumber } from "./core/types.js";
import { DaoDenLongClient, type UserSettings } from "./render/gameScene.js";

const SETTINGS_STORAGE_KEY = "dao-den-long-settings";

const NIGHT_INTROS: Record<NightNumber, { title: string; quote: string }> = {
  1: {
    title: "Đêm 1 — Đảo Bến (Cần giữ ≥ 3/5 đèn tới Bình Minh)",
    quote:
      "Ông Đăng: \"Đèn thắp rồi vẫn cạn dần dầu, và khi dầu dưới 30 thì Bóng Mực sẽ lao vào hút! Hãy châm thêm dầu bằng phím E và giữ ít nhất 3 ngọn đèn sáng tới lúc mặt trời mọc!\"",
  },
  2: {
    title: "Đêm 2 — Đảo Cau (Cần giữ ≥ 4/6 đèn tới Bình Minh)",
    quote:
      "Ông Đăng: \"Mỗi lần thắp đèn thành công túi đom đóm của con sẽ rộng thêm (+2, tối đa 20). Hãy lướt (Shift) qua cầu tre, nhặt Bùa Gió và giữ ít nhất 4 ngọn đèn sáng tới bình minh!\"",
  },
  3: {
    title: "Đêm 3 — Đảo Chuông (Cần giữ ≥ 5/7 đèn tới Bình Minh)",
    quote:
      "Ông Đăng: \"Đêm cuối cùng trên Đảo Chuông! Nếu đèn tắt, thắp lại chỉ tốn 5 đom đóm. Hãy canh chừng thanh dầu trên bản đồ và giữ ít nhất 5 ngọn đèn sáng tới bình minh!\"",
  },
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { volume: 0.7, mouseSensitivity: 1.0, colorblindMode: false };
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : 0.7,
      mouseSensitivity:
        typeof parsed.mouseSensitivity === "number"
          ? Math.max(0.2, Math.min(2.5, parsed.mouseSensitivity))
          : 1.0,
      colorblindMode: Boolean(parsed.colorblindMode),
    };
  } catch {
    return { volume: 0.7, mouseSensitivity: 1.0, colorblindMode: false };
  }
}

function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota errors
  }
}

const appEl = document.getElementById("app");
const hudRoot = document.getElementById("hud-root")!;
const screenMenu = document.getElementById("screen-menu")!;
const screenIntro = document.getElementById("screen-intro")!;
const screenPause = document.getElementById("screen-pause")!;
const screenSettings = document.getElementById("screen-settings")!;
const screenResult = document.getElementById("screen-result")!;

let settings = loadSettings();
let currentNight: NightNumber = 1;
let campaignTotalScore = 0;
let settingsReturnTo: "menu" | "pause" = "menu";

const optVolume = document.getElementById("opt-volume") as HTMLInputElement;
const lblVolume = document.getElementById("lbl-volume")!;
const optSens = document.getElementById("opt-sens") as HTMLInputElement;
const lblSens = document.getElementById("lbl-sens")!;
const optColorblind = document.getElementById("opt-colorblind") as HTMLInputElement;

function syncSettingsUI(): void {
  optVolume.value = String(Math.round(settings.volume * 100));
  lblVolume.textContent = `${Math.round(settings.volume * 100)}%`;
  optSens.value = settings.mouseSensitivity.toFixed(1);
  lblSens.textContent = settings.mouseSensitivity.toFixed(1);
  optColorblind.checked = settings.colorblindMode;
}
syncSettingsUI();

function hideAllOverlays(): void {
  screenMenu.classList.remove("visible");
  screenIntro.classList.remove("visible");
  screenPause.classList.remove("visible");
  screenSettings.classList.remove("visible");
  screenResult.classList.remove("visible", "dawn");
}

if (appEl) {
  const client = new DaoDenLongClient(
    appEl,
    {
      flamesIconsEl: document.getElementById("flames-icons")!,
      capReadoutEl: document.getElementById("cap-readout")!,
      charmBadgeEl: document.getElementById("charm-badge")!,
      nightLabelEl: document.getElementById("night-label")!,
      clockTextEl: document.getElementById("clock-text")!,
      windBannerEl: document.getElementById("wind-banner")!,
      lanternsEl: document.getElementById("stat-lanterns")!,
      scoreEl: document.getElementById("stat-score")!,
      fuelListEl: document.getElementById("lantern-fuel-list")!,
      interactPromptEl: document.getElementById("interact-prompt")!,
      moteBarEl: document.getElementById("mote-bar")!,
      cdDashEl: document.getElementById("cd-dash")!,
      cdPulseEl: document.getElementById("cd-pulse")!,
      lanternArrowEl: document.getElementById("lantern-arrow")!,
      minimapCanvas: document.getElementById("minimap-canvas") as HTMLCanvasElement,
    },
    {
      onPauseToggled(paused): void {
        if (paused) {
          screenPause.classList.add("visible");
        } else {
          screenPause.classList.remove("visible");
          screenSettings.classList.remove("visible");
        }
      },
      onNightComplete(res): void {
        hudRoot.classList.remove("active");
        screenResult.classList.add("visible");
        const titleEl = document.getElementById("result-title")!;
        const subEl = document.getElementById("result-subtitle")!;
        const breakdownEl = document.getElementById("result-breakdown")!;
        const primaryBtn = document.getElementById("btn-result-primary") as HTMLButtonElement;

        if (res.won) {
          campaignTotalScore += res.score;
          if (res.night === 3) {
            screenResult.classList.add("dawn");
            titleEl.textContent = "Bình Minh Rực Rỡ Trên Ba Hòn Đảo!";
            subEl.textContent = "Mây đã giữ vững ánh sáng của Đảo Bến, Đảo Cau và Đảo Chuông tới tận bình minh!";
            primaryBtn.textContent = "Chơi lại từ Đêm 1";
          } else {
            titleEl.textContent = `Sống sót qua Đêm ${res.night}!`;
            subEl.textContent = "Ánh đèn đã đứng vững trước sương đen tới lúc bình minh.";
            primaryBtn.textContent = `Sang Đêm ${res.night + 1}`;
          }
        } else {
          titleEl.textContent = `Thất bại ở Đêm ${res.night}`;
          subEl.textContent =
            res.reason === "no_flames"
              ? "Mây đã mất hết Ngọn Lửa."
              : "Khi bình minh lên, số Đèn Lồng đang sáng chưa đạt ngưỡng yêu cầu (60%).";
          primaryBtn.textContent = `Chơi lại Đêm ${res.night}`;
        }

        const b = res.breakdown;
        breakdownEl.innerHTML = `
          <div><span>Đom đóm nạp & châm dầu (+5/con)</span><span>+${b.motesUsed}</span></div>
          <div><span>Thắp đèn lần đầu (+100/đèn)</span><span>+${b.firstLights}</span></div>
          <div><span>Thắp lại đèn tắt (+40/lần)</span><span>+${b.relights}</span></div>
          <div><span>Bóng Mực trúng Tỏa Sáng (+5 / +15 hút dầu)</span><span>+${b.stuns}</span></div>
          <div><span>Thưởng đèn sáng lúc bình minh (+50 + dầu)</span><span>+${b.dawnLanternBonus}</span></div>
          <div><span>Thưởng Ngọn Lửa còn lại (+50/lửa)</span><span>+${b.flameBonus}</span></div>
          <div class="total"><span>Điểm Đêm ${res.night}</span><span>${res.score}</span></div>
          <div class="total"><span>Tổng điểm hành trình</span><span>${campaignTotalScore}</span></div>
        `;

        primaryBtn.onclick = () => {
          if (res.won && res.night < 3) {
            showNightIntro((res.night + 1) as NightNumber);
          } else if (res.won && res.night === 3) {
            campaignTotalScore = 0;
            showNightIntro(1);
          } else {
            showNightIntro(res.night);
          }
        };
      },
    }
  );

  client.applySettings(settings);

  const showNightIntro = (night: NightNumber): void => {
    currentNight = night;
    hideAllOverlays();
    hudRoot.classList.remove("active");
    document.getElementById("intro-title")!.textContent = NIGHT_INTROS[night].title;
    document.getElementById("intro-quote")!.textContent = NIGHT_INTROS[night].quote;
    screenIntro.classList.add("visible");
  };

  document.getElementById("btn-start-campaign")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    showNightIntro(1);
  });
  document.getElementById("btn-pick-1")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    showNightIntro(1);
  });
  document.getElementById("btn-pick-2")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    showNightIntro(2);
  });
  document.getElementById("btn-pick-3")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    showNightIntro(3);
  });

  document.getElementById("btn-begin-night")!.addEventListener("click", () => {
    hideAllOverlays();
    hudRoot.classList.add("active");
    client.startNight(currentNight);
  });

  document.getElementById("btn-resume")!.addEventListener("click", () => {
    client.togglePause();
  });

  document.getElementById("btn-restart-night")!.addEventListener("click", () => {
    hideAllOverlays();
    hudRoot.classList.add("active");
    client.startNight(currentNight);
  });

  const returnToMenu = (): void => {
    client.stopNight();
    hudRoot.classList.remove("active");
    hideAllOverlays();
    screenMenu.classList.add("visible");
  };

  document.getElementById("btn-back-menu-pause")!.addEventListener("click", returnToMenu);
  document.getElementById("btn-result-menu")!.addEventListener("click", returnToMenu);

  document.getElementById("btn-open-settings-menu")!.addEventListener("click", () => {
    settingsReturnTo = "menu";
    hideAllOverlays();
    screenSettings.classList.add("visible");
  });

  document.getElementById("btn-open-settings-pause")!.addEventListener("click", () => {
    settingsReturnTo = "pause";
    screenPause.classList.remove("visible");
    screenSettings.classList.add("visible");
  });

  optVolume.addEventListener("input", () => {
    settings.volume = Number(optVolume.value) / 100;
    lblVolume.textContent = `${optVolume.value}%`;
    client.applySettings(settings);
    saveSettings(settings);
  });

  optSens.addEventListener("input", () => {
    settings.mouseSensitivity = Number(optSens.value);
    lblSens.textContent = settings.mouseSensitivity.toFixed(1);
    client.applySettings(settings);
    saveSettings(settings);
  });

  optColorblind.addEventListener("change", () => {
    settings.colorblindMode = optColorblind.checked;
    client.applySettings(settings);
    saveSettings(settings);
  });

  document.getElementById("btn-close-settings")!.addEventListener("click", () => {
    screenSettings.classList.remove("visible");
    if (settingsReturnTo === "menu") {
      screenMenu.classList.add("visible");
    } else {
      screenPause.classList.add("visible");
    }
  });
}
