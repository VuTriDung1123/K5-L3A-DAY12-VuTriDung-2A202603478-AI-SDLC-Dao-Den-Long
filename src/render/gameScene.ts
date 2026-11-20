import * as THREE from "three";
import { FIXED_DT, TICK_RATE } from "../core/config.js";
import { getNightMapConfig } from "../core/maps.js";
import { GameSimulation } from "../core/simulation.js";
import type { ActiveInputState, NightNumber, ScoreBreakdown } from "../core/types.js";
import { SoundBank } from "./audio.js";
import { buildNightWorld, type WorldVisualHandle } from "./worldDecor.js";

export type CameraMode = "third" | "first";

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
  cameraMode: CameraMode;
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
  onCameraModeChanged?(mode: CameraMode): void;
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
  cdCameraEl: HTMLElement;
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
  fuelBarGroup: THREE.Group;
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
  private menuShowcaseActive = false;
  private sim: GameSimulation | null = null;
  private settings: UserSettings = {
    volume: 0.7,
    mouseSensitivity: 1.0,
    colorblindMode: false,
    reducedMotion: false,
    largeText: false,
    cameraMode: "third",
    keyBindings: { ...DEFAULT_KEY_BINDINGS },
  };

  private readonly playerGroup = buildMayMesh();
  private readonly fpLanternRig = buildFirstPersonLanternRig();
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
  private camPitchDeg = 0;
  private dragging = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
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
    this.scene.fog = new THREE.FogExp2(0x162045, 0.0032);

    this.camera = new THREE.PerspectiveCamera(
      56,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1200
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.ambientLight = new THREE.AmbientLight(0xdce6ff, 0.36);
    this.scene.add(this.ambientLight);
    this.hemiLight = new THREE.HemisphereLight(0xb2c8ff, 0x243347, 0.72);
    this.scene.add(this.hemiLight);
    const moon = new THREE.DirectionalLight(0xe4ecff, 0.95);
    moon.position.set(-45, 72, -55);
    this.scene.add(moon);
    const dawnRim = new THREE.DirectionalLight(0xffb478, 0.45);
    dawnRim.position.set(60, 26, -80);
    this.scene.add(dawnRim);

    this.scene.add(this.playerGroup.root);
    this.camera.add(this.fpLanternRig.root);
    this.fpLanternRig.root.visible = false;
    this.scene.add(this.camera);

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

  /** Loads a scenic animated 3D Japanese village panorama behind the Main Menu. */
  startMenuShowcase(): void {
    if (this.sim) return;
    this.worldHandle?.dispose();
    const map1 = getNightMapConfig(1);
    this.worldHandle = buildNightWorld(this.scene, map1);
    this.menuShowcaseActive = true;
    this.playerGroup.root.visible = true;
    this.playerGroup.root.position.set(0, 0, 0);
    this.playerGroup.root.rotation.y = 0;
    this.fpLanternRig.root.visible = false;
    this.ambientLight.intensity = 0.56;
  }

  toggleCameraMode(): void {
    const next: CameraMode = this.settings.cameraMode === "third" ? "first" : "third";
    this.settings.cameraMode = next;
    this.camPitchDeg = 0;
    this.callbacks.onCameraModeChanged?.(next);
    this.pushSubtitle(
      next === "first" ? "Chế độ Camera: Góc nhìn thứ 1 (V để đổi)" : "Chế độ Camera: Góc nhìn thứ 3 (V để đổi)",
      2.2
    );
  }

  startNight(night: NightNumber, seed = this.sessionSeed++): void {
    this.menuShowcaseActive = false;
    this.clearDynamicEntities();
    this.worldHandle?.dispose();

    this.sim = new GameSimulation({ seed, night });
    this.worldHandle = buildNightWorld(this.scene, this.sim.map);
    this.camYawDeg = 0;
    this.camPitchDeg = 0;
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
      this.camPitchDeg = 0;
      return;
    }
    if (e.code === "KeyV" && this.sim && !this.sim.paused) {
      this.toggleCameraMode();
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
    this.lastPointerY = e.clientY;
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.camYawDeg = (this.camYawDeg - dx * 0.35 * this.settings.mouseSensitivity) % 360;
    if (this.settings.cameraMode === "first") {
      this.camPitchDeg = Math.max(
        -28,
        Math.min(35, this.camPitchDeg - dy * 0.25 * this.settings.mouseSensitivity)
      );
    }
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

      const dawnProgress = Math.max(
        0,
        Math.min(1, 1 - this.sim.rawTimeLeftS / Math.max(1, this.sim.map.durationS))
      );
      const litRatio =
        this.sim.lanterns.filter((l) => l.lit).length / Math.max(1, this.sim.lanterns.length);
      this.worldHandle?.update(
        elapsedSec,
        this.sim.wind,
        this.settings.reducedMotion,
        dawnProgress,
        litRatio
      );
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
    } else if (this.menuShowcaseActive && this.worldHandle) {
      // Gentle cinematic orbit showcasing the glowing ancient Japanese village behind the Main Menu
      this.worldHandle.update(
        elapsedSec,
        { active: false, warning: false, dirDeg: 0 },
        this.settings.reducedMotion,
        0.35,
        0.75
      );
      const orbitA = this.settings.reducedMotion ? -Math.PI * 0.5 : -Math.PI * 0.5 + elapsedSec * 0.08;
      this.camera.position.set(Math.cos(orbitA) * 20, 7.2, Math.sin(orbitA) * 20);
      this.camera.lookAt(0, 2.2, 8);
      this.playerGroup.root.rotation.y = Math.sin(elapsedSec * 0.5) * 0.4;
      this.playerGroup.miniLantern.rotation.z = this.settings.reducedMotion
        ? 0
        : Math.sin(elapsedSec * 3.2) * 0.12;
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
    const isMoving = sim.player.grounded && speedMag > 0.35;
    const walkPhase = elapsedSec * (sim.player.dashTicks > 0 ? 20 : 12.5);
    const walkBob =
      !this.settings.reducedMotion && isMoving ? Math.abs(Math.sin(walkPhase)) * 0.065 : 0;

    this.playerGroup.root.position.set(
      sim.player.pos[0],
      sim.player.pos[1] + walkBob,
      sim.player.pos[2]
    );
    this.playerGroup.root.rotation.y = sim.player.facingYawRad;

    // Articulated limbs animation (legs stride, left arm counter-swing, right lantern arm & staff sway)
    if (!this.settings.reducedMotion && isMoving) {
      const swing = Math.sin(walkPhase) * Math.min(1, speedMag / 5.5);
      this.playerGroup.leftLeg.rotation.x = swing * 0.65;
      this.playerGroup.rightLeg.rotation.x = -swing * 0.65;
      this.playerGroup.leftArm.rotation.x = -swing * 0.55;
      this.playerGroup.rightArm.rotation.x = -0.62 + swing * 0.16;
    } else if (!sim.player.grounded) {
      // Expressive mid-air jump tuck
      this.playerGroup.leftLeg.rotation.x = 0.38;
      this.playerGroup.rightLeg.rotation.x = -0.28;
      this.playerGroup.leftArm.rotation.x = -0.45;
      this.playerGroup.rightArm.rotation.x = -0.82;
    } else {
      this.playerGroup.leftLeg.rotation.x = 0;
      this.playerGroup.rightLeg.rotation.x = 0;
      this.playerGroup.leftArm.rotation.x = 0;
      this.playerGroup.rightArm.rotation.x = -0.52;
    }

    this.playerGroup.miniLantern.rotation.z = this.settings.reducedMotion
      ? 0
      : Math.sin(elapsedSec * 4.5) * (0.08 + Math.min(0.18, speedMag * 0.025));
    this.playerGroup.scarfTail.rotation.x =
      0.28 +
      Math.min(0.95, speedMag * 0.08) +
      (this.settings.reducedMotion ? 0 : Math.sin(elapsedSec * 10) * 0.08);

    const isFirstPerson = this.settings.cameraMode === "first";
    const blinkVisible =
      sim.player.respawnTicks > 0
        ? false
        : sim.player.invulnTicks > 0 && !this.settings.reducedMotion
          ? Math.floor(elapsedSec * 16) % 2 === 0
          : true;
    this.playerGroup.root.visible = !isFirstPerson && blinkVisible;
    this.fpLanternRig.root.visible = isFirstPerson && sim.player.respawnTicks === 0;
    if (isFirstPerson) {
      const swayX = this.settings.reducedMotion ? 0 : Math.cos(walkPhase * 0.5) * (isMoving ? 0.032 : 0.008);
      const swayY = this.settings.reducedMotion ? 0 : Math.sin(walkPhase) * (isMoving ? 0.028 : 0.006);
      this.fpLanternRig.root.position.set(0.62 + swayX, -0.26 + swayY, -0.98);
      this.fpLanternRig.lantern.rotation.z = this.settings.reducedMotion
        ? 0
        : Math.sin(elapsedSec * 4.2) * 0.1;
    }

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

        vis.fuelBarGroup.visible = true;
        vis.fuelBarGroup.lookAt(this.camera.position);
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
        vis.fuelBarGroup.visible = false;
      }
    }

    this.ambientLight.intensity = 0.34 + 0.56 * (litCount / Math.max(1, sim.lanterns.length));

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
    const shake =
      !this.settings.reducedMotion && this.cameraShakeTimer > 0
        ? Math.sin(elapsedSec * 65) * 0.24
        : 0;

    if (this.settings.cameraMode === "first") {
      const speedMag = Math.hypot(this.sim.player.vel[0], this.sim.player.vel[2]);
      const headBob =
        !this.settings.reducedMotion && this.sim.player.grounded && speedMag > 0.35
          ? Math.sin(elapsedSec * 12.5) * 0.055
          : 0;
      const eyeY = p[1] + 1.48 + headBob;
      this.camera.position.set(p[0] + shake * 0.5, eyeY, p[2]);
      const pitchRad = (this.camPitchDeg * Math.PI) / 180;
      const lookDist = 12;
      const horiz = Math.cos(pitchRad) * lookDist;
      this.camera.lookAt(
        p[0] + Math.sin(theta) * horiz,
        eyeY + Math.sin(pitchRad) * lookDist,
        p[2] + Math.cos(theta) * horiz
      );
      return;
    }

    const dist = 12.2;
    const height = 4.6;
    const tx = p[0] - Math.sin(theta) * dist + shake;
    const tz = p[2] - Math.cos(theta) * dist;
    this.camera.position.lerp(new THREE.Vector3(tx, p[1] + height, tz), 0.16);
    this.camera.lookAt(p[0], p[1] + 2.05, p[2]);
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

    this.hud.cdCameraEl.textContent = this.settings.cameraMode === "first" ? "Thứ 1" : "Thứ 3";

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
      // Draw the two Night 3 shrine ramps (30 deg and 150 deg, r=24..30)
      ctx.strokeStyle = "#d4be94";
      ctx.lineWidth = 4;
      for (const deg of [30, 150]) {
        const rad = (deg * Math.PI) / 180;
        const [x1, z1] = toMap(24 * Math.cos(rad), 24 * Math.sin(rad));
        const [x2, z2] = toMap(30 * Math.cos(rad), 30 * Math.sin(rad));
        ctx.beginPath();
        ctx.moveTo(x1, z1);
        ctx.lineTo(x2, z2);
        ctx.stroke();
      }
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
    const marginX = 52;
    const marginTop = Math.abs(nx) < 0.35 && ny > 0 ? 112 : 52;
    const marginBottom = Math.abs(nx) < 0.45 && ny < 0 ? 118 : 52;
    const sx = w * 0.5 + nx * (w * 0.5 - marginX);
    const sy =
      ny > 0
        ? h * 0.5 - ny * (h * 0.5 - marginTop)
        : h * 0.5 - ny * (h * 0.5 - marginBottom);
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

interface MayRig {
  root: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  miniLantern: THREE.Group;
  scarfTail: THREE.Mesh;
}

/** Builds a detailed, articulated character model for May (legs, sandals, kimono coat, obi, scarf, arms, lantern staff, expressive face, hair & Non La hat). */
function buildMayMesh(): MayRig {
  const root = new THREE.Group();

  const coatMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayCoat, roughness: 0.72 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.62 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x232942, roughness: 0.85 });
  const sandalMat = new THREE.MeshStandardMaterial({ color: 0x7a5233, roughness: 0.82 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf8dcc0, roughness: 0.78 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x1b1a29, roughness: 0.82 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x543620, roughness: 0.8 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: PALETTE.gold,
    emissive: 0x7a5010,
    emissiveIntensity: 0.4,
    metalness: 0.5,
    roughness: 0.3,
  });

  // 1. Articulated Legs (Hakama trousers + wooden Geta sandals)
  const makeLeg = (sx: number): THREE.Group => {
    const hip = new THREE.Group();
    hip.position.set(sx, 0.44, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.24, 10), pantsMat);
    thigh.position.y = -0.1;
    hip.add(thigh);
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.2, 10), pantsMat);
    calf.position.y = -0.28;
    hip.add(calf);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.24), sandalMat);
    foot.position.set(0, -0.4, 0.04);
    hip.add(foot);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.035, 0.06), scarfMat);
    strap.position.set(0, -0.355, 0.07);
    hip.add(strap);
    return hip;
  };
  const leftLeg = makeLeg(-0.14);
  const rightLeg = makeLeg(0.14);
  root.add(leftLeg, rightLeg);

  // 2. Layered Tunic / Kimono Robe + Crimson Obi Sash + Golden Trim
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.38, 0.52, 16), coatMat);
  skirt.position.y = 0.56;
  root.add(skirt);

  const hemTrim = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.025, 6, 20), scarfMat);
  hemTrim.rotation.x = Math.PI / 2;
  hemTrim.position.y = 0.32;
  root.add(hemTrim);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.23, 0.42, 14), coatMat);
  torso.position.y = 0.96;
  root.add(torso);

  const obi = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.255, 0.16, 14), scarfMat);
  obi.position.y = 0.78;
  root.add(obi);
  const obiKnot = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.15, 0.14), scarfMat);
  obiKnot.position.set(0, 0.78, -0.24);
  root.add(obiKnot);
  const obiCord = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 6, 16), goldMat);
  obiCord.rotation.x = Math.PI / 2;
  obiCord.position.y = 0.78;
  root.add(obiCord);

  const scarfCollar = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.065, 8, 16), scarfMat);
  scarfCollar.rotation.x = Math.PI / 2;
  scarfCollar.position.y = 1.15;
  root.add(scarfCollar);

  const scarfTail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, 0.05), scarfMat);
  scarfTail.position.set(0, 0.96, -0.26);
  root.add(scarfTail);

  // 3. Articulated Arms with flowing Kimono sleeves & hands
  const makeArm = (sx: number): THREE.Group => {
    const sh = new THREE.Group();
    sh.position.set(sx, 1.1, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.14, 0.36, 10), coatMat);
    upper.position.y = -0.17;
    sh.add(upper);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.022, 6, 12), scarfMat);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.34;
    sh.add(cuff);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 10), skinMat);
    hand.position.y = -0.39;
    sh.add(hand);
    return sh;
  };
  const leftArm = makeArm(-0.29);
  const rightArm = makeArm(0.29);
  rightArm.rotation.x = -0.52;
  root.add(leftArm, rightArm);

  // Bamboo lantern staff + swinging glowing paper lantern in May's right hand
  const miniLantern = new THREE.Group();
  miniLantern.position.set(0, -0.4, 0.08);
  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.52, 6), woodMat);
  staff.rotation.x = Math.PI / 2.2;
  staff.position.set(0, 0.06, 0.2);
  miniLantern.add(staff);

  const lanternCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 12, 12),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lanternCore,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 2.0,
    })
  );
  lanternCore.scale.set(0.88, 1.25, 0.88);
  lanternCore.position.set(0, -0.14, 0.44);
  miniLantern.add(lanternCore);

  const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.05, 8), woodMat);
  capTop.position.set(0, 0.02, 0.44);
  miniLantern.add(capTop);
  const capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 8), woodMat);
  capBot.position.set(0, -0.3, 0.44);
  miniLantern.add(capBot);

  const miniLight = new THREE.PointLight(PALETTE.lanternLit, 2.8, 10);
  miniLight.position.set(0, -0.12, 0.48);
  miniLantern.add(miniLight);
  rightArm.add(miniLantern);

  // 4. Expressive Head, Dark Hair, Sparkling Eyes, Rosy Cheeks & Woven Non La Hat
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 16, 16), skinMat);
  head.position.y = 1.35;
  root.add(head);

  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.245, 14, 12), hairMat);
  hairCap.position.set(0, 1.38, -0.04);
  root.add(hairCap);
  for (const sx of [-0.19, 0.19]) {
    const lock = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.03, 0.26, 8), hairMat);
    lock.position.set(sx, 1.25, 0.06);
    root.add(lock);
  }

  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x141320 });
  const glintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const blushMat = new THREE.MeshBasicMaterial({ color: 0xff9aa8, transparent: true, opacity: 0.65 });
  for (const sx of [-0.085, 0.085]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), eyeMat);
    eye.position.set(sx, 1.35, 0.205);
    root.add(eye);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), glintMat);
    glint.position.set(sx + 0.01, 1.365, 0.23);
    root.add(glint);
    const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.032, 8), blushMat);
    cheek.position.set(sx * 1.45, 1.3, 0.21);
    root.add(cheek);
  }

  const nonLa = new THREE.Mesh(
    new THREE.ConeGeometry(0.64, 0.34, 24),
    new THREE.MeshStandardMaterial({ color: PALETTE.sandHat, roughness: 0.8 })
  );
  nonLa.position.y = 1.62;
  root.add(nonLa);
  const hatBand = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.025, 6, 18), scarfMat);
  hatBand.rotation.x = Math.PI / 2;
  hatBand.position.y = 1.56;
  root.add(hatBand);

  return { root, leftLeg, rightLeg, leftArm, rightArm, miniLantern, scarfTail };
}

/** Builds the cozy first-person viewmodel (May's sleeve & swaying glowing hand-lantern in bottom-right corner). */
function buildFirstPersonLanternRig(): { root: THREE.Group; lantern: THREE.Group } {
  const root = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayCoat, roughness: 0.72 });
  const scarfMat = new THREE.MeshStandardMaterial({ color: PALETTE.mayScarf, roughness: 0.62 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x543620, roughness: 0.8 });

  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.42, 10), coatMat);
  sleeve.rotation.x = Math.PI / 2.6;
  sleeve.position.set(0.08, -0.14, 0.22);
  root.add(sleeve);
  const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.02, 6, 12), scarfMat);
  cuff.position.set(0.05, -0.02, 0.03);
  root.add(cuff);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.56, 6), woodMat);
  staff.rotation.x = Math.PI / 2.2;
  staff.position.set(0.02, 0.04, -0.16);
  root.add(staff);

  const lantern = new THREE.Group();
  lantern.position.set(0.0, 0.08, -0.4);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 12, 12),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lanternCore,
      emissive: PALETTE.lanternLit,
      emissiveIntensity: 2.1,
    })
  );
  glow.scale.set(0.86, 1.24, 0.86);
  glow.position.y = -0.18;
  lantern.add(glow);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.05, 8), woodMat);
  cap.position.y = -0.01;
  lantern.add(cap);
  const bot = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.05, 8), woodMat);
  bot.position.y = -0.35;
  lantern.add(bot);

  const fpLight = new THREE.PointLight(PALETTE.lanternLit, 2.4, 10);
  fpLight.position.set(0, -0.18, 0);
  lantern.add(fpLight);

  root.add(lantern);
  return { root, lantern };
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

  const fuelBarGroup = new THREE.Group();
  fuelBarGroup.position.y = 3.55;
  group.add(fuelBarGroup);

  const fuelBarBg = new THREE.Mesh(
    new THREE.BoxGeometry(1.26, 0.16, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x121629 })
  );
  fuelBarGroup.add(fuelBarBg);

  const fuelBarMat = new THREE.MeshBasicMaterial({
    color: PALETTE.gold,
    transparent: true,
    opacity: 0.95,
  });
  const fuelBarFill = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.11, 0.1), fuelBarMat);
  fuelBarGroup.add(fuelBarFill);

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
    fuelBarGroup,
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
