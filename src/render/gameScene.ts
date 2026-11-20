import * as THREE from "three";
import { FIXED_DT, TICK_RATE } from "../core/config.js";
import { GameSimulation } from "../core/simulation.js";
import type { ActiveInputState, NightNumber, ScoreBreakdown } from "../core/types.js";
import { SoundBank } from "./audio.js";
import { buildNightWorld, type WorldVisualHandle } from "./worldDecor.js";

export interface KeyBindings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  jump: string;
  dash: string;
  interact: string;
  pulse: string;
  pause: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  interact: "KeyE",
  pulse: "KeyQ",
  pause: "Escape",
};

export interface UserSettings {
  volume: number;
  mouseSensitivity: number;
  colorblindMode: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  keyBindings: KeyBindings;
}

export interface GameUiCallbacks {
  onNightComplete(result: {
    won: boolean;
    night: NightNumber;
    seed: number;
    score: number;
    breakdown: ScoreBreakdown;
    reason: string | null;
  }): void;
  onPauseToggled(paused: boolean): void;
}

export interface HudElements {
  flamesIconsEl: HTMLElement;
  capReadoutEl: HTMLElement;
  charmBadgeEl: HTMLElement;
  nightLabelEl: HTMLElement;
  clockTextEl: HTMLElement;
  windBannerEl: HTMLElement;
  lanternsEl: HTMLElement;
  scoreEl: HTMLElement;
  fuelListEl: HTMLElement;
  interactPromptEl: HTMLElement;
  subtitleBannerEl: HTMLElement;
  moteBarEl: HTMLElement;
  cdDashEl: HTMLElement;
  cdPulseEl: HTMLElement;
  lanternArrowEl: HTMLElement;
  shadeArrowEl: HTMLElement;
  minimapCanvas: HTMLCanvasElement;
}

const PALETTE = {
  sky: 0x0e1430,
  fog: 0x1b2350,
  lanternLit: 0xffb347,
  lanternCore: 0xffe9b0,
  lanternUnlit: 0x5b5f6e,
  moteCore: 0xfff6c2,
  moteGlow: 0xffe58a,
  shadeBody: 0x120a1a,
  shadeRimNormal: 0x7a3cff,
  shadeRimColorblind: 0x00b3ff,
  shadeStunned: 0x3a3450,
  mayCoat: 0xe8e2d0,
  mayScarf: 0xc8102e,
  charmRed: 0xc8102e,
  gold: 0xf2c14e,
  drifter: 0x8fa3b8,
  sandHat: 0xc9b48a,
};

interface LanternVisual {
  group: THREE.Group;
  housingGroup: THREE.Group;
  core: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  tearStrips: THREE.Group;
  fuelBarBg: THREE.Mesh;
  fuelBarFill: THREE.Mesh;
  fuelBarMat: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
  lightShaft: THREE.Mesh;
  safeRing: THREE.Mesh;
}

interface ShadeVisual {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  rimMat: THREE.MeshStandardMaterial;
  orbitDrops: THREE.Mesh[];
  drainBeam: THREE.Line;
  drainBeamMat: THREE.LineBasicMaterial;
}

interface DrifterVisual {
  group: THREE.Group;
  segments: THREE.Mesh[];
  orb: THREE.Mesh;
}

/**
 * Coordinates the Three.js 3D Japanese-village world, radar minimap, 3D lantern fuel gauges,
 * full accessibility (key rebinding, subtitles, shade-spawn directional arrow, reduced motion,
 * large text, colorblind mode), and fixed 60 Hz GameSimulation loop.
 */
export class DaoDenLongClient {
  private readonly container: HTMLElement;
  private readonly hud: HudElements;
  private readonly callbacks: GameUiCallbacks;
  readonly audio = new SoundBank();

  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly ambientLight: THREE.AmbientLight;
  private readonly hemiLight: THREE.HemisphereLight;

  private worldHandle: WorldVisualHandle | null = null;
  private sim: GameSimulation | null = null;
  private settings: UserSettings = {
    volume: 0.7,
    mouseSensitivity: 1.0,
    colorblindMode: false,
    reducedMotion: false,
    largeText: false,
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
  };

  private readonly playerGroup = buildMayMesh();
  private readonly dashTrailMeshes: THREE.Mesh[] = [];
  private readonly dashTrailHistory: Array<[number, number, number]> = [];
  private readonly pulseRing: THREE.Mesh;
  private readonly pulseRingMat: THREE.MeshBasicMaterial;
  private pulseAnimRemaining = 0;

  private readonly lanternVisuals = new Map<string, LanternVisual>();
  private readonly moteMeshes = new Map<string, THREE.Mesh>();
  private readonly shadeVisuals = new Map<string, ShadeVisual>();
  private readonly drifterVisuals = new Map<string, DrifterVisual>();
  private readonly charmMeshes = new Map<string, THREE.Group>();

  private readonly keys = new Set<string>();
  private camYawDeg = 0;
  private dragging = false;
  private lastPointerX = 0;
  private accumulator = 0;
  private lastPerf = performance.now();
  private startPerf = performance.now();
  private rafId = 0;
  private endReported = false;
  private lastWarnedWind = false;
  private pendingPauseToggle = false;
  private sessionSeed = 42;
  private renderedMoteSlots = 0;
  private inputLockedForRebind = false;

  // Subtitle / visual cue state
  private subtitleText = "";
  private subtitleTimer = 0;
  private recentShadePos: [number, number, number] | null = null;
  private recentShadeArrowTimer = 0;
  private cameraShakeTimer = 0;

  private readonly moteGeo = new THREE.SphereGeometry(0.24, 12, 12);
  private readonly moteRandomMat = new THREE.MeshStandardMaterial({
    color: PALETTE.moteCore,
    emissive: PALETTE.moteGlow,
    emissiveIntensity: 1.85,
  });
  private readonly moteDroppedMat = new THREE.MeshStandardMaterial({
    color: PALETTE.moteCore,
    emissive: PALETTE.lanternLit,
    emissiveIntensity: 1.55,
  });

  constructor(container: HTMLElement, hud: HudElements, callbacks: GameUiCallbacks) {
    this.container = container;
    this.hud = hud;
    this.callbacks = callbacks;

    this.scene.background = new THREE.Color(PALETTE.sky);
    this.scene.fog = new THREE.FogExp2(PALETTE.fog, 0.012);

    this.camera = new THREE.PerspectiveCamera(
      56,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      260
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0x9fb4ff, 0x162238, 0.48);
    this.scene.add(this.hemiLight);
    const moon = new THREE.DirectionalLight(0xd2ddff, 0.72);
    moon.position.set(25, 42, -20);
    this.scene.add(moon);

    this.scene.add(this.playerGroup.root);

    const ghostGeo = new THREE.ConeGeometry(0.38, 0.9, 10);
    for (let i = 0; i < 4; i += 1) {
      const ghost = new THREE.Mesh(
        ghostGeo,
        new THREE.MeshBasicMaterial({
          color: PALETTE.gold,
          transparent: true,
          opacity: 0.35 - i * 0.07,
        })
      );
      ghost.visible = false;
      this.scene.add(ghost);
      this.dashTrailMeshes.push(ghost);
    }

    this.pulseRingMat = new THREE.MeshBasicMaterial({
      color: PALETTE.lanternLit,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.pulseRing = new THREE.Mesh(new THREE.RingGeometry(0.6, 1.0, 48), this.pulseRingMat);
    this.pulseRing.rotation.x = -Math.PI / 2;
    this.pulseRing.visible = false;
    this.scene.add(this.pulseRing);

    this.ensureMoteSlots(10);
    this.bindEvents();
    this.rafId = requestAnimationFrame(this.loop);
  }

  setInputLocked(locked: boolean): void {
    this.inputLockedForRebind = locked;
    if (locked) this.keys.clear();
  }

  applySettings(settings: UserSettings): void {
    this.settings = {
      ...settings,
      keyBindings: { ...settings.keyBindings },
    };
    this.audio.setVolume(settings.volume);
    document.body.classList.toggle("colorblind", settings.colorblindMode);
    document.body.classList.toggle("reduced-motion", settings.reducedMotion);
    document.body.classList.toggle("large-text", settings.largeText);
  }

  startNight(night: NightNumber, seed = this.sessionSeed++): void {
    this.clearDynamicEntities();
    this.worldHandle?.dispose();

    this.sim = new GameSimulation({ seed, night });
    this.worldHandle = buildNightWorld(this.scene, this.sim.map);
    this.camYawDeg = 0;
    this.accumulator = 0;
    this.endReported = false;
    this.pendingPauseToggle = false;
    this.lastWarnedWind = false;
    this.pulseAnimRemaining = 0;
    this.pulseRing.visible = false;
    this.dashTrailHistory.length = 0;
    this.subtitleText = "";
    this.subtitleTimer = 0;
    this.recentShadePos = null;
    this.recentShadeArrowTimer = 0;

    for (const l of this.sim.lanterns) {
      const vis = buildLanternVisual(this.sim.tuning.safe_radius);
      vis.group.position.set(l.pos[0], l.pos[1], l.pos[2]);
      this.scene.add(vis.group);
      this.lanternVisuals.set(l.id, vis);
    }

    for (const c of this.sim.charms) {
      const mesh = buildCharmMesh();
      mesh.position.set(c.pos[0], c.pos[1] + 0.9, c.pos[2]);
      this.scene.add(mesh);
      this.charmMeshes.set(c.id, mesh);
    }

    this.hud.nightLabelEl.textContent = `Đêm ${night} · ${this.sim.map.name}`;
    this.ensureMoteSlots(this.sim.player.capacity);
    this.audio.unlock();
    this.audio.startAmbient();
  }

  stopNight(): void {
    this.audio.stopAmbient();
    this.clearDynamicEntities();
    this.worldHandle?.dispose();
    this.worldHandle = null;
    this.sim = null;
  }

  togglePause(): void {
    if (!this.sim || this.sim.isFinished()) return;
    this.pendingPauseToggle = true;
  }

  dispose(): void {
    cancelAnimationFrame(this.rafId);
    this.stopNight();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerup", this.onPointerUp);
    window.removeEventListener("resize", this.onResize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  private pushSubtitle(text: string, durationSec = 3.2): void {
    this.subtitleText = text;
    this.subtitleTimer = durationSec;
  }

  private ensureMoteSlots(capacity: number): void {
    if (this.renderedMoteSlots === capacity) return;
    this.renderedMoteSlots = capacity;
    this.hud.moteBarEl.innerHTML = "";
    for (let i = 0; i < capacity; i += 1) {
      const slot = document.createElement("div");
      slot.className = "mote-slot";
      this.hud.moteBarEl.appendChild(slot);
    }
  }

  private clearDynamicEntities(): void {
    for (const vis of this.lanternVisuals.values()) this.scene.remove(vis.group);
    this.lanternVisuals.clear();
    for (const mesh of this.moteMeshes.values()) this.scene.remove(mesh);
    this.moteMeshes.clear();
    for (const vis of this.shadeVisuals.values()) {
      this.scene.remove(vis.group);
      this.scene.remove(vis.drainBeam);
    }
    this.shadeVisuals.clear();
    for (const vis of this.drifterVisuals.values()) this.scene.remove(vis.group);
    this.drifterVisuals.clear();
    for (const mesh of this.charmMeshes.values()) this.scene.remove(mesh);
    this.charmMeshes.clear();
    for (const g of this.dashTrailMeshes) g.visible = false;
  }

  private bindEvents(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    window.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);
    window.addEventListener("resize", this.onResize);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.inputLockedForRebind) return;
    const activeTag = document.activeElement?.tagName;
    if (activeTag === "INPUT" || activeTag === "TEXTAREA") return;

    this.audio.unlock();
    const kb = this.settings.keyBindings;
    if (e.code === kb.pause || (kb.pause === "Escape" && e.code === "KeyP")) {
      this.togglePause();
      return;
    }
    if (e.code === "KeyC") {
      this.camYawDeg = 0;
      return;
    }
    this.keys.add(e.code);
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private readonly onPointerDown = (e: PointerEvent): void => {
    this.audio.unlock();
    this.dragging = true;
    this.lastPointerX = e.clientX;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;
    this.camYawDeg = (this.camYawDeg - dx * 0.35 * this.settings.mouseSensitivity) % 360;
  };

  private readonly onPointerUp = (): void => {
    this.dragging = false;
  };

  private readonly onResize = (): void => {
    const w = this.container.clientWidth;
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private readonly loop = (now: number): void => {
    const dt = Math.min(0.1, (now - this.lastPerf) / 1000);
    this.lastPerf = now;
    const elapsedSec = (now - this.startPerf) / 1000;

    if (this.subtitleTimer > 0) this.subtitleTimer = Math.max(0, this.subtitleTimer - dt);
    if (this.recentShadeArrowTimer > 0)
      this.recentShadeArrowTimer = Math.max(0, this.recentShadeArrowTimer - dt);
    if (this.cameraShakeTimer > 0) this.cameraShakeTimer = Math.max(0, this.cameraShakeTimer - dt);

    if (this.sim) {
      if (this.keys.has("KeyJ")) this.camYawDeg = (this.camYawDeg + 120 * dt) % 360;
      if (this.keys.has("KeyL")) this.camYawDeg = (this.camYawDeg - 120 * dt) % 360;

      const wasGroundedBefore = this.sim.player.grounded;
      this.accumulator += dt;
      while (this.accumulator >= FIXED_DT) {
        if (this.sim.isFinished()) {
          this.accumulator = 0;
          break;
        }
        const input = this.sampleInput();
        if (this.pendingPauseToggle) {
          input.pause = true;
          this.pendingPauseToggle = false;
        }
        const prevPause = this.sim.paused;
        const events = this.sim.step(input);
        if (this.sim.paused !== prevPause) {
          this.callbacks.onPauseToggled(this.sim.paused);
        }
        this.handleAudioAndSubtitles(events, wasGroundedBefore);

        if (this.sim.player.dashTicks > 0 && !this.settings.reducedMotion) {
          this.dashTrailHistory.unshift([...this.sim.player.pos]);
          if (this.dashTrailHistory.length > 4) this.dashTrailHistory.pop();
        } else if (this.dashTrailHistory.length > 0) {
          this.dashTrailHistory.pop();
        }

        this.accumulator -= FIXED_DT;
      }

      this.worldHandle?.update(elapsedSec, this.sim.wind, this.settings.reducedMotion);
      this.syncSceneVisuals(elapsedSec, dt);
      this.updateCamera(elapsedSec);
      this.updateHud(elapsedSec);
      this.drawMinimap(elapsedSec);

      if (this.sim.isFinished() && !this.endReported) {
        this.endReported = true;
        this.callbacks.onNightComplete({
          won: this.sim.state === "won",
          night: this.sim.night,
          seed: this.sim.seed,
          score: this.sim.score,
          breakdown: { ...this.sim.scoreBreakdown },
          reason: this.sim.gameOverReason,
        });
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private sampleInput(): ActiveInputState {
    const kb = this.settings.keyBindings;
    const forward = this.keys.has(kb.moveUp) || this.keys.has("ArrowUp");
    const backward = this.keys.has(kb.moveDown) || this.keys.has("ArrowDown");
    const right = this.keys.has(kb.moveRight) || this.keys.has("ArrowRight");
    const left = this.keys.has(kb.moveLeft) || this.keys.has("ArrowLeft");
    const mx = (left ? 1 : 0) - (right ? 1 : 0);
    const mz = (forward ? 1 : 0) - (backward ? 1 : 0);

    return {
      move: [mx, mz],
      cam_yaw_deg: this.camYawDeg,
      jump: this.keys.has(kb.jump),
      interact: this.keys.has(kb.interact) || (kb.interact === "KeyE" && this.keys.has("KeyF")),
      pulse: this.keys.has(kb.pulse),
      dash:
        this.keys.has(kb.dash) || (kb.dash === "ShiftLeft" && this.keys.has("ShiftRight")),
      pause: false,
    };
  }

  private handleAudioAndSubtitles(
    events: ReturnType<GameSimulation["step"]>,
    wasGroundedBefore: boolean
  ): void {
    if (!this.sim) return;
    if (wasGroundedBefore && !this.sim.player.grounded && this.sim.player.vel[1] > 1) {
      this.audio.playJump();
    }
    if (this.sim.wind.warning && !this.lastWarnedWind) {
      this.audio.playWindWarn();
      this.pushSubtitle(`⚠ Gió mạnh sắp thổi (hướng ${Math.round(this.sim.wind.dirDeg)}°)!`, 3.5);
    }
    this.lastWarnedWind = this.sim.wind.warning;

    const secsLeft = Math.ceil(this.sim.rawTimeLeftS);
    if (
      this.sim.state === "playing" &&
      secsLeft <= 10 &&
      secsLeft > 0 &&
      secsLeft !== this.sim.lastCountdownSecond
    ) {
      this.sim.lastCountdownSecond = secsLeft;
      this.audio.playCountdownTick();
      this.pushSubtitle(`⚠ Còn ${secsLeft} giây nữa tới Bình Minh!`, 1.4);
    }

    for (const ev of events) {
      if (ev.name === "mote_picked") this.audio.playPickup();
      else if (ev.name === "charm_picked") {
        this.audio.playCharm();
        this.pushSubtitle("Đã nhặt Bùa Gió! Tốc độ 7.2 m/s & Lướt không hồi chiêu!", 3.0);
      } else if (ev.name === "dash") this.audio.playDash();
      else if (ev.name === "deposit" || ev.name === "refuel") {
        const litNow = this.sim.lanterns.find((l) => l.id === ev.data.lantern_id)?.lit ?? false;
        this.audio.playDeposit(litNow);
      } else if (ev.name === "lantern_out") {
        this.audio.playHit();
        this.pushSubtitle(`⚠ Đèn ${ev.data.lantern_id} đã cạn dầu và tắt!`, 3.5);
      } else if (ev.name === "pulse") {
        this.audio.playPulse();
        if (!this.settings.reducedMotion) {
          this.pulseAnimRemaining = 0.45;
          this.pulseRing.position.set(
            this.sim.player.pos[0],
            this.sim.player.pos[1] + 0.12,
            this.sim.player.pos[2]
          );
          this.pulseRing.visible = true;
        }
      } else if (ev.name === "shade_spawned") {
        this.audio.playShadeSpawn();
        const spawned = this.sim.shades.find((s) => s.id === ev.data.id);
        if (spawned) {
          this.recentShadePos = [...spawned.pos];
          this.recentShadeArrowTimer = 4.0;
        }
        this.pushSubtitle(`⚠ Bóng Mực (${ev.data.id}) vừa xuất hiện trong sương!`, 3.5);
      } else if (ev.name === "player_hit") {
        this.audio.playHit();
        if (!this.settings.reducedMotion) this.cameraShakeTimer = 0.25;
      } else if (ev.name === "game_over") {
        this.audio.playGameOver(ev.data.result === "won");
      }
    }
  }

  private syncSceneVisuals(elapsedSec: number, dt: number): void {
    if (!this.sim) return;
    const sim = this.sim;
    const speedMag = Math.hypot(sim.player.vel[0], sim.player.vel[2]);
    const walkBob =
      !this.settings.reducedMotion && sim.player.grounded && speedMag > 0.4
        ? Math.sin(elapsedSec * 14) * 0.05
        : 0;

    this.playerGroup.root.position.set(
      sim.player.pos[0],
      sim.player.pos[1] + walkBob,
      sim.player.pos[2]
    );
    this.playerGroup.root.rotation.y = sim.player.facingYawRad;
    this.playerGroup.miniLantern.position.x = this.settings.reducedMotion
      ? 0
      : Math.sin(elapsedSec * 4.5) * 0.05;
    this.playerGroup.scarfTail.rotation.x =
      0.25 +
      Math.min(0.9, speedMag * 0.07) +
      (this.settings.reducedMotion ? 0 : Math.sin(elapsedSec * 10) * 0.08);
    this.playerGroup.root.visible =
      sim.player.respawnTicks > 0
        ? false
        : sim.player.invulnTicks > 0 && !this.settings.reducedMotion
          ? Math.floor(elapsedSec * 16) % 2 === 0
          : true;

    for (let i = 0; i < this.dashTrailMeshes.length; i += 1) {
      const ghost = this.dashTrailMeshes[i];
      const hist = this.dashTrailHistory[i];
      if (hist && sim.player.dashTicks > 0 && !this.settings.reducedMotion) {
        ghost.visible = true;
        ghost.position.set(hist[0], hist[1] + 0.48, hist[2]);
      } else {
        ghost.visible = false;
      }
    }

    const blink1Hz = this.settings.reducedMotion
      ? 0.75
      : 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(elapsedSec * Math.PI * 2));
    let litCount = 0;

    for (const l of sim.lanterns) {
      if (l.lit) litCount += 1;
      const vis = this.lanternVisuals.get(l.id);
      if (!vis) continue;

      const fuel = l.lit ? l.fuelTicks / TICK_RATE : 0;
      const isLowFuel = l.lit && fuel < sim.tuning.low_fuel_threshold;

      vis.core.rotation.y = elapsedSec * (l.lit ? 1.4 : 0.3);
      if (l.lit) {
        vis.housingGroup.scale.set(1, 1, 1);
        vis.tearStrips.visible = false;
        vis.coreMat.color.setHex(PALETTE.lanternCore);
        vis.coreMat.emissive.setHex(PALETTE.lanternLit);
        const pulseFactor = isLowFuel ? blink1Hz : 1.0;
        vis.coreMat.emissiveIntensity = (1.9 + Math.sin(elapsedSec * 4) * 0.18) * pulseFactor;
        vis.light.intensity = 7.5 * pulseFactor;
        vis.lightShaft.visible = true;
        vis.safeRing.visible = sim.hasSafeZone(l);
        if (!this.settings.reducedMotion) vis.safeRing.rotation.z = elapsedSec * 0.4;

        vis.fuelBarBg.visible = true;
        vis.fuelBarFill.visible = true;
        const ratio = Math.max(0.02, fuel / sim.tuning.fuel_max);
        vis.fuelBarFill.scale.set(ratio, 1, 1);
        vis.fuelBarFill.position.x = -0.6 * (1 - ratio);
        vis.fuelBarMat.color.setHex(
          isLowFuel
            ? this.settings.colorblindMode
              ? 0xffffff
              : 0xff5a5f
            : PALETTE.gold
        );
        vis.fuelBarMat.opacity = isLowFuel ? blink1Hz : 0.95;
      } else {
        vis.housingGroup.scale.set(0.8, 0.8, 0.8);
        vis.tearStrips.visible = true;
        const reqCost = l.ever_lit ? sim.tuning.relight_cost : sim.tuning.lantern_cost;
        const ratio = l.deposited / Math.max(1, reqCost);
        vis.coreMat.color.setHex(PALETTE.lanternUnlit);
        vis.coreMat.emissive.setHex(PALETTE.lanternLit);
        vis.coreMat.emissiveIntensity = 0.08 + ratio * 0.85;
        vis.light.intensity = ratio * 1.8;
        vis.lightShaft.visible = false;
        vis.safeRing.visible = false;
        vis.fuelBarBg.visible = false;
        vis.fuelBarFill.visible = false;
      }
    }

    this.ambientLight.intensity = 0.15 + 0.55 * (litCount / Math.max(1, sim.lanterns.length));

    if (this.pulseAnimRemaining > 0) {
      this.pulseAnimRemaining = Math.max(0, this.pulseAnimRemaining - dt);
      const t = 1 - this.pulseAnimRemaining / 0.45;
      const r = 0.5 + t * sim.tuning.pulse_radius;
      this.pulseRing.scale.set(r, r, 1);
      this.pulseRingMat.opacity = (1 - t) * 0.85;
      if (this.pulseAnimRemaining === 0) this.pulseRing.visible = false;
    }

    const activeMotes = new Set<string>();
    for (const m of sim.motes) {
      activeMotes.add(m.id);
      let mesh = this.moteMeshes.get(m.id);
      if (!mesh) {
        mesh = new THREE.Mesh(
          this.moteGeo,
          m.kind === "dropped" ? this.moteDroppedMat : this.moteRandomMat
        );
        this.scene.add(mesh);
        this.moteMeshes.set(m.id, mesh);
      }
      const bob = this.settings.reducedMotion ? 0 : Math.sin(elapsedSec * 3.5 + m.pos[0]) * 0.15;
      mesh.position.set(m.pos[0], m.pos[1] + 0.65 + bob, m.pos[2]);
    }
    for (const [id, mesh] of this.moteMeshes.entries()) {
      if (!activeMotes.has(id)) {
        this.scene.remove(mesh);
        this.moteMeshes.delete(id);
      }
    }

    for (const c of sim.charms) {
      const mesh = this.charmMeshes.get(c.id);
      if (mesh) {
        mesh.visible = c.available;
        if (!this.settings.reducedMotion) mesh.rotation.y = elapsedSec * 2.2;
        mesh.position.y = c.pos[1] + 0.9 + (this.settings.reducedMotion ? 0 : Math.sin(elapsedSec * 3) * 0.15);
      }
    }

    const rimHex = this.settings.colorblindMode
      ? PALETTE.shadeRimColorblind
      : PALETTE.shadeRimNormal;
    const activeShades = new Set<string>();

    for (const s of sim.shades) {
      activeShades.add(s.id);
      let vis = this.shadeVisuals.get(s.id);
      if (!vis) {
        vis = buildShadeVisual(this.scene);
        this.shadeVisuals.set(s.id, vis);
      }
      vis.group.position.set(
        s.pos[0],
        s.pos[1] + (this.settings.reducedMotion ? 0 : Math.sin(elapsedSec * 4 + s.pos[0]) * 0.1),
        s.pos[2]
      );
      vis.group.rotation.y =
        s.state === "stunned"
          ? elapsedSec * (this.settings.reducedMotion ? 2 : 10)
          : Math.atan2(sim.player.pos[0] - s.pos[0], sim.player.pos[2] - s.pos[2]);

      vis.orbitDrops.forEach((drop, idx) => {
        const a = elapsedSec * 3.5 + (idx * Math.PI * 2) / 3;
        drop.position.set(Math.cos(a) * 0.68, Math.sin(a * 2) * 0.18, Math.sin(a) * 0.68);
      });

      if (s.state === "stunned") {
        vis.bodyMat.color.setHex(PALETTE.shadeStunned);
        vis.rimMat.color.setHex(0xffffff);
        vis.rimMat.emissive.setHex(0xffffff);
      } else {
        vis.bodyMat.color.setHex(PALETTE.shadeBody);
        vis.bodyMat.emissive.setHex(rimHex);
        vis.rimMat.color.setHex(rimHex);
        vis.rimMat.emissive.setHex(rimHex);
      }

      const drainTarget =
        s.state === "drain" ? sim.lanterns.find((l) => l.id === s.targetLanternId) : null;
      if (drainTarget) {
        vis.drainBeam.visible = true;
        vis.drainBeamMat.color.setHex(rimHex);
        const posAttr = vis.drainBeam.geometry.getAttribute("position") as THREE.BufferAttribute;
        posAttr.setXYZ(0, s.pos[0], s.pos[1] + 0.1, s.pos[2]);
        posAttr.setXYZ(1, drainTarget.pos[0], drainTarget.pos[1] + 2.3, drainTarget.pos[2]);
        posAttr.needsUpdate = true;
      } else {
        vis.drainBeam.visible = false;
      }
    }
    for (const [id, vis] of this.shadeVisuals.entries()) {
      if (!activeShades.has(id)) {
        this.scene.remove(vis.group);
        this.scene.remove(vis.drainBeam);
        this.shadeVisuals.delete(id);
      }
    }

    const activeDrifters = new Set<string>();
    for (const d of sim.drifters) {
      if (d.state === "removed") continue;
      activeDrifters.add(d.id);
      let vis = this.drifterVisuals.get(d.id);
      if (!vis) {
        vis = buildDrifterVisual();
        this.scene.add(vis.group);
        this.drifterVisuals.set(d.id, vis);
      }
      vis.group.position.set(d.pos[0], d.pos[1], d.pos[2]);
      vis.group.rotation.y = elapsedSec * 3;
      vis.orb.visible = d.stolen > 0;
      vis.segments.forEach((seg, idx) => {
        seg.position.y = Math.sin(elapsedSec * 6 + idx) * 0.16;
      });
    }
    for (const [id, vis] of this.drifterVisuals.entries()) {
      if (!activeDrifters.has(id)) {
        this.scene.remove(vis.group);
        this.drifterVisuals.delete(id);
      }
    }
  }

  private updateCamera(elapsedSec: number): void {
    if (!this.sim) return;
    const p = this.sim.player.pos;
    const theta = (this.camYawDeg * Math.PI) / 180;
    const dist = 11.5;
    const height = 5.8;
    const shake =
      !this.settings.reducedMotion && this.cameraShakeTimer > 0
        ? Math.sin(elapsedSec * 65) * 0.28
        : 0;
    const tx = p[0] - Math.sin(theta) * dist + shake;
    const tz = p[2] - Math.cos(theta) * dist;
    this.camera.position.lerp(new THREE.Vector3(tx, p[1] + height, tz), 0.16);
    this.camera.lookAt(p[0], p[1] + 1.1, p[2]);
  }

  private updateHud(_elapsedSec: number): void {
    if (!this.sim) return;
    const sim = this.sim;
    const warnPrefix = this.settings.colorblindMode ? "⚠ " : "";

    this.hud.flamesIconsEl.innerHTML = "";
    for (let i = 0; i < sim.tuning.flames; i += 1) {
      const span = document.createElement("span");
      span.className = i < sim.player.flames ? "flame-icon" : "flame-icon lost";
      span.textContent = "🔥";
      this.hud.flamesIconsEl.appendChild(span);
    }

    this.hud.capReadoutEl.textContent = `Đom đóm: ${sim.player.carried} / ${sim.player.capacity}`;
    this.ensureMoteSlots(sim.player.capacity);

    if (sim.player.charmTicks > 0) {
      this.hud.charmBadgeEl.style.display = "block";
      this.hud.charmBadgeEl.textContent = `Bùa Gió: ${(sim.player.charmTicks / TICK_RATE).toFixed(1)}s`;
    } else {
      this.hud.charmBadgeEl.style.display = "none";
    }

    const secs = Math.ceil(sim.rawTimeLeftS);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    this.hud.clockTextEl.textContent = secs <= 30 ? `${warnPrefix}${mm}:${ss}` : `${mm}:${ss}`;
    this.hud.clockTextEl.className = secs <= 30 ? "critical" : "";

    if (sim.wind.warning) {
      this.hud.windBannerEl.style.display = "block";
      this.hud.windBannerEl.textContent = `${warnPrefix}Gió mạnh sắp thổi!`;
    } else if (sim.wind.active) {
      this.hud.windBannerEl.style.display = "block";
      this.hud.windBannerEl.textContent = `${warnPrefix}Gió mạnh (${Math.round(sim.wind.dirDeg)}°)`;
    } else {
      this.hud.windBannerEl.style.display = "none";
    }

    const litCount = sim.lanterns.filter((l) => l.lit).length;
    const reqLit = Math.ceil(sim.tuning.win_ratio * sim.lanterns.length);
    this.hud.lanternsEl.textContent = `${litCount}/${sim.lanterns.length} (≥ ${reqLit})`;
    this.hud.scoreEl.textContent = String(sim.score);

    const lowFuelLanterns = sim.lanterns.filter(
      (l) => l.lit && l.fuelTicks < sim.tuning.low_fuel_threshold * TICK_RATE
    );

    // Visual subtitle cue (shows active event caption, or persistent low-fuel warning if any lantern < 30)
    if (this.subtitleTimer > 0 && this.subtitleText) {
      this.hud.subtitleBannerEl.style.display = "block";
      this.hud.subtitleBannerEl.textContent = this.subtitleText;
    } else if (lowFuelLanterns.length > 0) {
      this.hud.subtitleBannerEl.style.display = "block";
      const ids = lowFuelLanterns.map((l) => l.id).join(", ");
      this.hud.subtitleBannerEl.textContent = `⚠ Đèn ${ids} sắp cạn dầu (< 30)!`;
    } else {
      this.hud.subtitleBannerEl.style.display = "none";
    }

    this.hud.fuelListEl.innerHTML = sim.lanterns
      .map((l) => {
        const fuel = l.lit ? Math.round(l.fuelTicks / TICK_RATE) : 0;
        const low = l.lit && fuel < sim.tuning.low_fuel_threshold;
        const draining = sim.shades.some((s) => s.state === "drain" && s.targetLanternId === l.id);
        const statusLabel = !l.lit
          ? l.ever_lit
            ? "Tắt (5)"
            : "Tắt (10)"
          : `${low ? "⚠ " : ""}${fuel}%${draining ? " ⬇" : ""}`;
        return `<div class="fuel-row ${low ? "low" : ""}">
          <span>${l.id} ${statusLabel}</span>
          <div class="fuel-track"><div class="fuel-fill" style="width:${fuel}%"></div></div>
        </div>`;
      })
      .join("");

    const slots = this.hud.moteBarEl.children;
    for (let i = 0; i < slots.length; i += 1) {
      slots[i].className = i < sim.player.carried ? "mote-slot filled" : "mote-slot";
    }

    const kb = this.settings.keyBindings;
    const nearLantern = sim.findInteractableLantern();
    if (nearLantern) {
      this.hud.interactPromptEl.style.display = "block";
      const keyLabel = formatKeyLabel(kb.interact);
      if (!nearLantern.lit) {
        const reqCost = nearLantern.ever_lit ? sim.tuning.relight_cost : sim.tuning.lantern_cost;
        const label = nearLantern.ever_lit ? "Thắp lại" : "Nạp ánh sáng";
        this.hud.interactPromptEl.textContent = `${keyLabel} — ${label} ${nearLantern.id} (${nearLantern.deposited}/${reqCost})`;
      } else {
        const fuel = Math.round(nearLantern.fuelTicks / TICK_RATE);
        this.hud.interactPromptEl.textContent = `${keyLabel} — Châm dầu ${nearLantern.id} (${fuel}/100)`;
      }
    } else {
      this.hud.interactPromptEl.style.display = "none";
    }

    if (sim.player.charmTicks > 0) {
      this.hud.cdDashEl.textContent = "Miễn hồi!";
      this.hud.cdDashEl.className = "ability-status";
    } else if (sim.player.dashCdTicks > 0) {
      this.hud.cdDashEl.textContent = `${(sim.player.dashCdTicks / TICK_RATE).toFixed(1)}s`;
      this.hud.cdDashEl.className = "ability-status cd";
    } else {
      this.hud.cdDashEl.textContent = "Sẵn sàng";
      this.hud.cdDashEl.className = "ability-status";
    }

    if (sim.player.pulseCdTicks > 0) {
      this.hud.cdPulseEl.textContent = `${(sim.player.pulseCdTicks / TICK_RATE).toFixed(1)}s`;
      this.hud.cdPulseEl.className = "ability-status cd";
    } else if (sim.player.carried >= sim.tuning.pulse_cost) {
      this.hud.cdPulseEl.textContent = "Sẵn sàng";
      this.hud.cdPulseEl.className = "ability-status";
    } else {
      this.hud.cdPulseEl.textContent = `Cần ${sim.tuning.pulse_cost}`;
      this.hud.cdPulseEl.className = "ability-status cd";
    }

    this.updateOffscreenArrows(sim);
  }

  private drawMinimap(elapsedSec: number): void {
    if (!this.sim) return;
    const sim = this.sim;
    const canvas = this.hud.minimapCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    ctx.clearRect(0, 0, w, h);

    const worldCenterX = sim.night === 2 ? 35 : 0;
    const worldScale = sim.night === 2 ? 1.05 : sim.night === 3 ? 1.48 : 1.65;
    const toMap = (wx: number, wz: number): [number, number] => [
      cx + (wx - worldCenterX) * worldScale,
      cy + wz * worldScale,
    ];

    ctx.fillStyle = "rgba(47, 93, 80, 0.58)";
    ctx.strokeStyle = "rgba(201, 180, 138, 0.7)";
    ctx.lineWidth = 1.5;

    if (sim.night === 1) {
      ctx.beginPath();
      ctx.arc(cx, cy, 40 * worldScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (sim.night === 2) {
      const [ax, az] = toMap(0, 0);
      const [bx, bz] = toMap(70, 0);
      ctx.beginPath();
      ctx.arc(ax, az, 28 * worldScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, bz, 28 * worldScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      const [brX, brZ] = toMap(26, -2);
      ctx.fillStyle = "#6B4A2F";
      ctx.fillRect(brX, brZ, 18 * worldScale, 4 * worldScale);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, 45 * worldScale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(59, 115, 98, 0.65)";
      ctx.beginPath();
      ctx.arc(cx, cy, 24 * worldScale, 0, Math.PI, false);
      ctx.arc(cx, cy, 12 * worldScale, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "rgba(201, 180, 138, 0.45)";
      ctx.beginPath();
      ctx.arc(cx, cy, 8 * worldScale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#FFE58A";
    for (const m of sim.motes) {
      const [mx, mz] = toMap(m.pos[0], m.pos[2]);
      ctx.beginPath();
      ctx.arc(mx, mz, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const c of sim.charms) {
      if (!c.available) continue;
      const [chx, chz] = toMap(c.pos[0], c.pos[2]);
      ctx.fillStyle = "#C8102E";
      ctx.fillRect(chx - 3, chz - 3, 6, 6);
    }

    for (const l of sim.lanterns) {
      const [lx, lz] = toMap(l.pos[0], l.pos[2]);
      if (l.lit) {
        const fuelRatio = l.fuelTicks / (sim.tuning.fuel_max * TICK_RATE);
        const low = fuelRatio < 0.3;
        const blink =
          !low || this.settings.reducedMotion || Math.sin(elapsedSec * Math.PI * 2) > -0.2;
        if (blink) {
          ctx.fillStyle = low
            ? this.settings.colorblindMode
              ? "#FFFFFF"
              : "#FF5A5F"
            : "#FFB347";
          ctx.beginPath();
          ctx.arc(lx, lz, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "#FFE9B0";
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(lx, lz, 6.5, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fuelRatio);
        ctx.stroke();
      } else {
        ctx.strokeStyle = "#8FA3B8";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(lx - 3.5, lz - 3.5, 7, 7);
      }
    }

    const shadeColor = this.settings.colorblindMode ? "#00B3FF" : "#9E6BFF";
    for (const s of sim.shades) {
      const [sx, sz] = toMap(s.pos[0], s.pos[2]);
      ctx.fillStyle = s.state === "stunned" ? "#8FA3B8" : shadeColor;
      ctx.beginPath();
      ctx.arc(sx, sz, s.state === "drain" ? 4.5 : 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#8FA3B8";
    for (const d of sim.drifters) {
      if (d.state === "removed") continue;
      const [dx, dz] = toMap(d.pos[0], d.pos[2]);
      ctx.fillRect(dx - 2.5, dz - 2.5, 5, 5);
    }

    const [px, pz] = toMap(sim.player.pos[0], sim.player.pos[2]);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate(-sim.player.facingYawRad);
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4, -4);
    ctx.lineTo(4, -4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private updateOffscreenArrows(sim: GameSimulation): void {
    // 1. Nearest urgent lantern arrow
    const urgent = sim.lanterns.filter(
      (l) => !l.lit || l.fuelTicks < sim.tuning.low_fuel_threshold * TICK_RATE
    );
    if (urgent.length > 0) {
      let nearest = urgent[0];
      let bestDist = Infinity;
      for (const l of urgent) {
        const d = Math.hypot(l.pos[0] - sim.player.pos[0], l.pos[2] - sim.player.pos[2]);
        if (d < bestDist) {
          bestDist = d;
          nearest = l;
        }
      }
      this.placeEdgeArrow(this.hud.lanternArrowEl, [nearest.pos[0], nearest.pos[1] + 2.2, nearest.pos[2]]);
    } else {
      this.hud.lanternArrowEl.style.display = "none";
    }

    // 2. Newly spawned Shade directional edge arrow (accessibility visual cue)
    if (this.recentShadeArrowTimer > 0 && this.recentShadePos) {
      this.placeEdgeArrow(this.hud.shadeArrowEl, this.recentShadePos, true);
    } else {
      this.hud.shadeArrowEl.style.display = "none";
    }
  }

  private placeEdgeArrow(el: HTMLElement, target: [number, number, number], alwaysShow = false): void {
    const worldPos = new THREE.Vector3(target[0], target[1], target[2]);
    const proj = worldPos.project(this.camera);
    const inFront = proj.z < 1;
    const onScreen = inFront && Math.abs(proj.x) <= 0.9 && Math.abs(proj.y) <= 0.86;
    if (onScreen && !alwaysShow) {
      el.style.display = "none";
      return;
    }

    let nx = proj.x;
    let ny = proj.y;
    if (!inFront) {
      nx = -nx;
      ny = -ny;
    }
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;

    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const margin = 48;
    const sx = w * 0.5 + nx * (w * 0.5 - margin);
    const sy = h * 0.5 - ny * (h * 0.5 - margin);
    const angleDeg = (Math.atan2(nx, ny) * 180) / Math.PI;

    el.style.display = "block";
    el.style.left = `${sx - 18}px`;
    el.style.top = `${sy - 18}px`;
    el.style.transform = `rotate(${angleDeg}deg)`;
  }
}

export function formatKeyLabel(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Space") return "Space";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Escape") return "Esc";
  return code;
}

function buildMayMesh(): {
  root: THREE.Group;
  miniLantern: THREE.Mesh;
  scarfTail: THREE.Mesh;
} {
  const root = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.95, 16),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayCoat, roughness: 0.72 })
  );
  coat.position.y = 0.48;
  root.add(coat);

  const scarf = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.08, 8, 16),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.65 })
  );
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 0.92;
  root.add(scarf);

  const scarfTail = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.45, 0.05),
    new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.65 })
  );
  scarfTail.position.set(0, 0.75, -0.28);
  root.add(scarfTail);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xf6d8bc, roughness: 0.8 })
  );
  head.position.y = 1.1;
  root.add(head);

  const nonLa = new THREE.Mesh(
    new THREE.ConeGeometry(0.64, 0.35, 24),
    new THREE.MeshStandardMaterial({ color: PALETTE.sandHat, roughness: 0.82 })
  );
  nonLa.position.y = 1.34;
  root.add(nonLa);

  const miniLantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lanternCore,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 1.9,
    })
  );
  miniLantern.position.set(0, 1.08, 0.52);
  root.add(miniLantern);

  const miniLight = new THREE.PointLight(PALETTE.lanternLit, 2.4, 8.5);
  miniLight.position.set(0, 1.1, 0.55);
  root.add(miniLight);

  return { root, miniLantern, scarfTail };
}

function buildLanternVisual(safeRadius: number): LanternVisual {
  const group = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.4, 2.1, 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.lanternUnlit, roughness: 0.85 })
  );
  pillar.position.y = 1.05;
  group.add(pillar);

  const housingGroup = new THREE.Group();
  housingGroup.position.y = 2.45;
  group.add(housingGroup);

  const coreMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lanternUnlit,
    emissive: PALETTE.lanternLit,
    emissiveIntensity: 0.1,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.52, 0), coreMat);
  housingGroup.add(core);

  const tearStrips = new THREE.Group();
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x1b1e28 });
  for (let i = 0; i < 2; i += 1) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.08, 0.78), stripMat);
    strip.rotation.z = i === 0 ? 0.45 : -0.45;
    strip.rotation.y = i * 0.8;
    tearStrips.add(strip);
  }
  housingGroup.add(tearStrips);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.96, 0.52, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b4052, roughness: 0.85 })
  );
  roof.position.y = 0.52;
  housingGroup.add(roof);

  // Soft volumetric-style golden light shaft cone
  const lightShaft = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 5.2, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: PALETTE.lanternLit,
      transparent: true,
      opacity: 0.09,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  lightShaft.position.y = 2.5;
  lightShaft.visible = false;
  group.add(lightShaft);

  const fuelBarBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, 0.16, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x121629 })
  );
  fuelBarBg.position.y = 3.55;
  group.add(fuelBarBg);

  const fuelBarMat = new THREE.MeshBasicMaterial({
    color: PALETTE.gold,
    transparent: true,
    opacity: 0.95,
  });
  const fuelBarFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.11, 0.1), fuelBarMat);
  fuelBarFill.position.y = 3.55;
  group.add(fuelBarFill);

  const light = new THREE.PointLight(PALETTE.lanternLit, 0, 20);
  light.position.y = 2.5;
  group.add(light);

  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(safeRadius - 0.14, safeRadius, 48),
    new THREE.MeshBasicMaterial({
      color: PALETTE.gold,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
    })
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.05;
  safeRing.visible = false;
  group.add(safeRing);

  return {
    group,
    housingGroup,
    core,
    coreMat,
    tearStrips,
    fuelBarBg,
    fuelBarFill,
    fuelBarMat,
    light,
    lightShaft,
    safeRing,
  };
}

function buildShadeVisual(scene: THREE.Scene): ShadeVisual {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeBody,
    emissive: PALETTE.shadeRimNormal,
    emissiveIntensity: 0.38,
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), bodyMat);
  group.add(body);

  const rimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.shadeRimNormal,
    emissive: PALETTE.shadeRimNormal,
    emissiveIntensity: 1.5,
  });
  for (const xOff of [-0.18, 0.18]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), rimMat);
    eye.position.set(xOff, 0.12, 0.45);
    group.add(eye);
  }

  const orbitDrops: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), rimMat);
    group.add(drop);
    orbitDrops.push(drop);
  }

  const beamGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const drainBeamMat = new THREE.LineBasicMaterial({ color: PALETTE.shadeRimNormal });
  const drainBeam = new THREE.Line(beamGeo, drainBeamMat);
  drainBeam.visible = false;

  scene.add(group);
  scene.add(drainBeam);
  return { group, bodyMat, rimMat, orbitDrops, drainBeam, drainBeamMat };
}

function buildDrifterVisual(): DrifterVisual {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: PALETTE.drifter,
    emissive: 0x3b4d63,
    emissiveIntensity: 0.7,
    side: THREE.DoubleSide,
  });
  const segments: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.75), mat);
    seg.position.z = -i * 0.65;
    group.add(seg);
    segments.push(seg);
  }
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 8, 8),
    new THREE.MeshStandardMaterial({
      color: PALETTE.moteCore,
      emissive: PALETTE.moteGlow,
      emissiveIntensity: 1.5,
    })
  );
  orb.position.set(0, 0.35, 0);
  orb.visible = false;
  group.add(orb);
  return { group, segments, orb };
}

function buildCharmMesh(): THREE.Group {
  const group = new THREE.Group();
  const tag = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.75, 0.08),
    new THREE.MeshStandardMaterial({
      color: PALETTE.charmRed,
      emissive: 0x5c0615,
      emissiveIntensity: 0.8,
    })
  );
  group.add(tag);
  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.82, 0.05),
    new THREE.MeshStandardMaterial({
      color: PALETTE.gold,
      emissive: PALETTE.gold,
      emissiveIntensity: 0.9,
    })
  );
  group.add(border);
  return group;
}
