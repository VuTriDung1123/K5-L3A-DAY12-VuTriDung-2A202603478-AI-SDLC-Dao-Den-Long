import {
  addLeaderboardEntry,
  isValidLeaderboardName,
  sortAndTrimLeaderboard,
  type LeaderboardEntry,
} from "./core/leaderboard.js";
import type { NightNumber } from "./core/types.js";
import { runBenchScene } from "./render/benchScene.js";
import {
  DEFAULT_KEY_BINDINGS,
  DaoDenLongClient,
  formatKeyLabel,
  type KeyBindings,
  type UserSettings,
} from "./render/gameScene.js";

const SETTINGS_STORAGE_KEY = "dao-den-long-settings";
const LEADERBOARD_STORAGE_KEY = "dao-den-long-leaderboard";

const ACTION_LABELS: Record<keyof KeyBindings, string> = {
  moveUp: "Đi tới",
  moveDown: "Đi lùi",
  moveLeft: "Sang trái",
  moveRight: "Sang phải",
  jump: "Nhảy",
  dash: "Lướt",
  interact: "Thắp / Châm dầu",
  pulse: "Tỏa Sáng",
  pause: "Tạm dừng",
};

const NIGHT_INTROS: Record<NightNumber, { title: string; quote: string }> = {
  1: {
    title: "Đêm 1 — Đảo Bến (Giữ ≥ 3/5 đèn tới Bình Minh)",
    quote:
      "Ông Đăng: \"Đèn thắp rồi vẫn cạn dần dầu, và khi dầu dưới 30 thì Bóng Mực sẽ lao vào hút! Hãy châm thêm dầu và giữ ít nhất 3 ngọn đèn sáng tới lúc mặt trời mọc!\"",
  },
  2: {
    title: "Đêm 2 — Đảo Cau (Giữ ≥ 4/6 đèn tới Bình Minh)",
    quote:
      "Ông Đăng: \"Mỗi lần thắp đèn thành công túi đom đóm sẽ rộng thêm (+2, tối đa 20). Hãy Lướt qua cầu tre, nhặt Bùa Gió và giữ ít nhất 4 ngọn đèn sáng tới bình minh!\"",
  },
  3: {
    title: "Đêm 3 — Đảo Chuông (Giữ ≥ 5/7 đèn tới Bình Minh)",
    quote:
      "Ông Đăng: \"Đêm cuối cùng trên Đảo Chuông! Nếu đèn tắt, thắp lại chỉ tốn 5 đom đóm. Hãy canh chừng thanh dầu trên bản đồ và giữ ít nhất 5 ngọn đèn sáng tới bình minh!\"",
  },
};

function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {
        volume: 0.7,
        mouseSensitivity: 1.0,
        colorblindMode: false,
        reducedMotion: false,
        largeText: false,
        keyBindings: { ...DEFAULT_KEY_BINDINGS },
      };
    }
    const parsed = JSON.parse(raw);
    return {
      volume: typeof parsed.volume === "number" ? Math.max(0, Math.min(1, parsed.volume)) : 0.7,
      mouseSensitivity:
        typeof parsed.mouseSensitivity === "number"
          ? Math.max(0.2, Math.min(2.5, parsed.mouseSensitivity))
          : 1.0,
      colorblindMode: Boolean(parsed.colorblindMode),
      reducedMotion: Boolean(parsed.reducedMotion),
      largeText: Boolean(parsed.largeText),
      keyBindings: {
        ...DEFAULT_KEY_BINDINGS,
        ...(typeof parsed.keyBindings === "object" && parsed.keyBindings ? parsed.keyBindings : {}),
      },
    };
  } catch {
    return {
      volume: 0.7,
      mouseSensitivity: 1.0,
      colorblindMode: false,
      reducedMotion: false,
      largeText: false,
      keyBindings: { ...DEFAULT_KEY_BINDINGS },
    };
  }
}

function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const resp = await fetch("/api/leaderboard");
    if (resp.ok) {
      const data = await resp.json();
      const sorted = sortAndTrimLeaderboard(Array.isArray(data?.entries) ? data.entries : []);
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sorted));
      return sorted;
    }
  } catch {
    // fallback to localStorage when hosted purely statically
  }
  try {
    const raw = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    return sortAndTrimLeaderboard(raw ? JSON.parse(raw) : []);
  } catch {
    return [];
  }
}

async function submitLeaderboardScore(
  name: string,
  score: number,
  nightsWon: number,
  seed: number
): Promise<LeaderboardEntry[]> {
  const payload = { name, score, nights_won: nightsWon, seed };
  try {
    const resp = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      const data = await resp.json();
      const sorted = sortAndTrimLeaderboard(Array.isArray(data?.entries) ? data.entries : []);
      localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(sorted));
      return sorted;
    }
  } catch {
    // fallback to localStorage
  }
  const existing = await fetchLeaderboard();
  const updated = addLeaderboardEntry(existing, payload);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

const appEl = document.getElementById("app");
const params = new URLSearchParams(window.location.search);

// Direct Benchmark Mode entry (?bench=1&seed=42&duration=30)
if (params.get("bench") === "1" && appEl) {
  document.getElementById("screen-menu")?.classList.remove("visible");
  const seed = Number(params.get("seed") ?? "42") || 42;
  const duration = Number(params.get("duration") ?? "30") || 30;
  runBenchScene(appEl, seed, duration);
} else if (appEl) {
  const hudRoot = document.getElementById("hud-root")!;
  const screenMenu = document.getElementById("screen-menu")!;
  const screenIntro = document.getElementById("screen-intro")!;
  const screenPause = document.getElementById("screen-pause")!;
  const screenSettings = document.getElementById("screen-settings")!;
  const screenLeaderboard = document.getElementById("screen-leaderboard")!;
  const screenResult = document.getElementById("screen-result")!;

  let settings = loadSettings();
  let currentNight: NightNumber = 1;
  let campaignTotalScore = 0;
  let campaignNightsWon = 0;
  let lastRunSeed = 42;
  let settingsReturnTo: "menu" | "pause" = "menu";
  let capturingAction: keyof KeyBindings | null = null;

  const optVolume = document.getElementById("opt-volume") as HTMLInputElement;
  const lblVolume = document.getElementById("lbl-volume")!;
  const optSens = document.getElementById("opt-sens") as HTMLInputElement;
  const lblSens = document.getElementById("lbl-sens")!;
  const optColorblind = document.getElementById("opt-colorblind") as HTMLInputElement;
  const optReduced = document.getElementById("opt-reduced-motion") as HTMLInputElement;
  const optLargeText = document.getElementById("opt-large-text") as HTMLInputElement;
  const keybindListEl = document.getElementById("keybind-list")!;
  const keybindErrorEl = document.getElementById("keybind-error")!;

  function hideAllOverlays(): void {
    screenMenu.classList.remove("visible");
    screenIntro.classList.remove("visible");
    screenPause.classList.remove("visible");
    screenSettings.classList.remove("visible");
    screenLeaderboard.classList.remove("visible");
    screenResult.classList.remove("visible", "dawn");
  }

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
      subtitleBannerEl: document.getElementById("subtitle-banner")!,
      moteBarEl: document.getElementById("mote-bar")!,
      cdDashEl: document.getElementById("cd-dash")!,
      cdPulseEl: document.getElementById("cd-pulse")!,
      lanternArrowEl: document.getElementById("lantern-arrow")!,
      shadeArrowEl: document.getElementById("shade-arrow")!,
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
        lastRunSeed = res.seed;

        const titleEl = document.getElementById("result-title")!;
        const subEl = document.getElementById("result-subtitle")!;
        const breakdownEl = document.getElementById("result-breakdown")!;
        const primaryBtn = document.getElementById("btn-result-primary") as HTMLButtonElement;
        const saveBox = document.getElementById("leaderboard-save-box")!;
        const saveMsg = document.getElementById("lb-save-msg")!;
        const nameInput = document.getElementById("lb-name-input") as HTMLInputElement;
        const saveBtn = document.getElementById("btn-save-score") as HTMLButtonElement;

        if (res.won) {
          campaignTotalScore += res.score;
          campaignNightsWon = Math.min(3, campaignNightsWon + 1);
          if (res.night === 3) {
            screenResult.classList.add("dawn");
            titleEl.textContent = "Bình Minh Rực Rỡ Trên Ba Hòn Đảo!";
            subEl.textContent =
              "Mây đã giữ vững ánh sáng của Đảo Bến, Đảo Cau và Đảo Chuông tới tận bình minh!";
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

        // Ticket-04 Section 3: allow saving to leaderboard after Dawn Victory (Night 3) OR after any loss
        const canSaveToLeaderboard = !res.won || res.night === 3;
        saveBox.style.display = canSaveToLeaderboard ? "block" : "none";
        saveMsg.textContent = "";
        saveBtn.disabled = false;
        saveBtn.onclick = async () => {
          const val = nameInput.value.trim();
          if (!isValidLeaderboardName(val)) {
            saveMsg.textContent = "⚠ Tên phải gồm 3–12 ký tự (chữ cái, số hoặc dấu _).";
            return;
          }
          try {
            await submitLeaderboardScore(val, campaignTotalScore, campaignNightsWon, lastRunSeed);
            saveMsg.textContent = "✓ Đã lưu thành công vào Bảng xếp hạng!";
            saveBtn.disabled = true;
          } catch (err) {
            saveMsg.textContent = `⚠ ${err instanceof Error ? err.message : String(err)}`;
          }
        };

        const b = res.breakdown;
        breakdownEl.innerHTML = `
          <div><span>Đom đóm nạp & châm dầu (+5/con)</span><span>+${b.motesUsed}</span></div>
          <div><span>Thắp đèn lần đầu (+100/đèn)</span><span>+${b.firstLights}</span></div>
          <div><span>Thắp lại đèn tắt (+40/lần)</span><span>+${b.relights}</span></div>
          <div><span>Bóng Mực trúng Tỏa Sáng (+5 / +15 hút dầu)</span><span>+${b.stuns}</span></div>
          <div><span>Thưởng đèn sáng lúc bình minh</span><span>+${b.dawnLanternBonus}</span></div>
          <div><span>Thưởng Ngọn Lửa còn lại (+50/lửa)</span><span>+${b.flameBonus}</span></div>
          <div class="total"><span>Điểm Đêm ${res.night}</span><span>${res.score}</span></div>
          <div class="total"><span>Tổng điểm hành trình</span><span>${campaignTotalScore}</span></div>
        `;

        primaryBtn.onclick = () => {
          if (res.won && res.night < 3) {
            showNightIntro((res.night + 1) as NightNumber);
          } else if (res.won && res.night === 3) {
            campaignTotalScore = 0;
            campaignNightsWon = 0;
            showNightIntro(1);
          } else {
            showNightIntro(res.night);
          }
        };
      },
    }
  );

  function renderKeybindsUI(): void {
    keybindListEl.innerHTML = "";
    (Object.keys(ACTION_LABELS) as Array<keyof KeyBindings>).forEach((action) => {
      const row = document.createElement("div");
      row.className = "keybind-row";
      const label = document.createElement("span");
      label.textContent = ACTION_LABELS[action];
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "secondary-btn keybind-btn";
      btn.textContent =
        capturingAction === action
          ? "Nhấn phím mới..."
          : formatKeyLabel(settings.keyBindings[action]);
      btn.onclick = () => {
        capturingAction = action;
        keybindErrorEl.textContent = "";
        client.setInputLocked(true);
        renderKeybindsUI();
      };
      row.append(label, btn);
      keybindListEl.appendChild(row);
    });
  }

  window.addEventListener("keydown", (e) => {
    if (!capturingAction) return;
    e.preventDefault();
    e.stopPropagation();

    const newCode = e.code;
    const conflict = (Object.keys(settings.keyBindings) as Array<keyof KeyBindings>).find(
      (k) => k !== capturingAction && settings.keyBindings[k] === newCode
    );

    if (conflict) {
      keybindErrorEl.textContent = `⚠ Phím [${formatKeyLabel(newCode)}] đang trùng với "${ACTION_LABELS[conflict]}"! Hãy chọn phím khác.`;
    } else {
      settings.keyBindings[capturingAction] = newCode;
      keybindErrorEl.textContent = "";
      saveSettings(settings);
      client.applySettings(settings);
    }
    capturingAction = null;
    client.setInputLocked(false);
    renderKeybindsUI();
  });

  function syncSettingsUI(): void {
    optVolume.value = String(Math.round(settings.volume * 100));
    lblVolume.textContent = `${Math.round(settings.volume * 100)}%`;
    optSens.value = settings.mouseSensitivity.toFixed(1);
    lblSens.textContent = settings.mouseSensitivity.toFixed(1);
    optColorblind.checked = settings.colorblindMode;
    optReduced.checked = settings.reducedMotion;
    optLargeText.checked = settings.largeText;
    renderKeybindsUI();
  }

  syncSettingsUI();
  client.applySettings(settings);

  async function openLeaderboardModal(): Promise<void> {
    hideAllOverlays();
    screenLeaderboard.classList.add("visible");
    const tbody = document.getElementById("lb-tbody")!;
    tbody.innerHTML = '<tr><td colspan="5">Đang tải...</td></tr>';
    const entries = await fetchLeaderboard();
    if (entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Chưa có kỷ lục nào. Hãy chơi và lưu điểm đầu tiên!</td></tr>';
      return;
    }
    tbody.innerHTML = entries
      .map(
        (e, i) => `<tr>
          <td>#${i + 1}</td>
          <td>${escapeHtml(e.name)}</td>
          <td><strong>${e.score}</strong></td>
          <td>${e.nights_won} / 3</td>
          <td>${e.seed}</td>
        </tr>`
      )
      .join("");
  }

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
    campaignNightsWon = 0;
    showNightIntro(1);
  });
  document.getElementById("btn-pick-1")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    campaignNightsWon = 0;
    showNightIntro(1);
  });
  document.getElementById("btn-pick-2")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    campaignNightsWon = 0;
    showNightIntro(2);
  });
  document.getElementById("btn-pick-3")!.addEventListener("click", () => {
    campaignTotalScore = 0;
    campaignNightsWon = 0;
    showNightIntro(3);
  });
  document.getElementById("btn-open-leaderboard")!.addEventListener("click", () => {
    void openLeaderboardModal();
  });
  document.getElementById("btn-close-leaderboard")!.addEventListener("click", () => {
    hideAllOverlays();
    screenMenu.classList.add("visible");
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

  document.getElementById("btn-reset-keybinds")!.addEventListener("click", () => {
    settings.keyBindings = { ...DEFAULT_KEY_BINDINGS };
    keybindErrorEl.textContent = "";
    saveSettings(settings);
    client.applySettings(settings);
    renderKeybindsUI();
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
  optReduced.addEventListener("change", () => {
    settings.reducedMotion = optReduced.checked;
    client.applySettings(settings);
    saveSettings(settings);
  });
  optLargeText.addEventListener("change", () => {
    settings.largeText = optLargeText.checked;
    client.applySettings(settings);
    saveSettings(settings);
  });

  document.getElementById("btn-close-settings")!.addEventListener("click", () => {
    capturingAction = null;
    client.setInputLocked(false);
    screenSettings.classList.remove("visible");
    if (settingsReturnTo === "menu") {
      screenMenu.classList.add("visible");
    } else {
      screenPause.classList.add("visible");
    }
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[ch] || ch;
  });
}
