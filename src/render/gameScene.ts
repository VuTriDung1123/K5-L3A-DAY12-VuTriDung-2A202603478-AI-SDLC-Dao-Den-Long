import * as THREE from "three";
import { FIXED_DT, TICK_RATE } from "../core/config.js";
import { GameSimulation } from "../core/simulation.js";
import type { ActiveInputState } from "../core/types.js";
import { SoundBank } from "./audio.js";
import { buildIslandDecor } from "./worldDecor.js";

interface LanternVisual {
  group: THREE.Group;
  core: THREE.Mesh;
  coreMat: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
  safeRing: THREE.Mesh;
  pips: THREE.Mesh[];
}

interface ShadeVisual {
  group: THREE.Group;
  bodyMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  wisps: THREE.Mesh[];
}

export interface GameHudRefs {
  lanternsEl: HTMLElement | null;
  flamesEl: HTMLElement | null;
  carriedEl: HTMLElement | null;
  timeEl: HTMLElement | null;
  scoreEl: HTMLElement | null;
  promptEl: HTMLElement | null;
  muteBtn: HTMLButtonElement | null;
  restartBtn: HTMLButtonElement | null;
  overlayEl: HTMLElement | null;
  overlayTitleEl: HTMLElement | null;
  overlaySubtitleEl: HTMLElement | null;
  overlayBreakdownEl: HTMLElement | null;
  replayBtn: HTMLButtonElement | null;
}

/** Mounts the interactive 3D Dao Den Long Night 1 experience bound to GameSimulation. */
export function mountDaoDenLongGame(container: HTMLElement, hud: GameHudRefs): () => void {
  const scene = new THREE.Scene();
  const darkSky = new THREE.Color(0x070a14);
  const dawnSky = new THREE.Color(0x1f2544);
  scene.background = darkSky.clone();
  const fog = new THREE.FogExp2(0x070a14, 0.028);
  scene.fog = fog;

  const camera = new THREE.PerspectiveCamera(
    56,
    container.clientWidth / Math.max(1, container.clientHeight),
    0.1,
    220
  );

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x4b5c8a, 0.65);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0x7c8fc7, 0x161b2e, 0.6);
  scene.add(hemiLight);
  const moonLight = new THREE.DirectionalLight(0xa5b9ff, 0.7);
  moonLight.position.set(22, 35, -18);
  scene.add(moonLight);

  const audio = new SoundBank();
  let sessionSeed = 42;
  let sim = new GameSimulation({ seed: sessionSeed, night: 1 });
  const decor = buildIslandDecor(
    scene,
    sim.lanterns.map((l) => l.pos)
  );

  // Build May (player) with traditional Non La + dangling mini lantern
  const playerGroup = buildMayMesh();
  scene.add(playerGroup.root);

  // Pulse shockwave visual ring
  const pulseRingGeo = new THREE.RingGeometry(0.6, 1.0, 48);
  const pulseRingMat = new THREE.MeshBasicMaterial({
    color: 0xffc864,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
  });
  const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
  pulseRing.rotation.x = -Math.PI / 2;
  pulseRing.position.y = 0.08;
  pulseRing.visible = false;
  scene.add(pulseRing);
  let pulseAnimRemaining = 0;

  // Build 5 Great Lantern visuals
  const lanternVisuals = new Map<string, LanternVisual>();
  for (const lantern of sim.lanterns) {
    const visual = buildLanternVisual(sim.tuning.safe_radius, sim.tuning.lantern_cost);
    visual.group.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);
    scene.add(visual.group);
    lanternVisuals.set(lantern.id, visual);
  }

  // Dynamic pools for Motes and Shades keyed by deterministic ID
  const moteMeshes = new Map<string, THREE.Mesh>();
  const shadeVisuals = new Map<string, ShadeVisual>();
  const moteGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const moteMat = new THREE.MeshStandardMaterial({
    color: 0xffe08a,
    emissive: 0xffaa2b,
    emissiveIntensity: 1.7,
  });

  // Input & camera orbit state
  const keys = new Set<string>();
  let camYawDeg = 0;
  let dragging = false;
  let lastPointerX = 0;
  let endOverlayShown = false;

  const resetGame = (): void => {
    sessionSeed += 1;
    sim = new GameSimulation({ seed: sessionSeed, night: 1 });
    endOverlayShown = false;
    pulseAnimRemaining = 0;
    pulseRing.visible = false;
    if (hud.overlayEl) hud.overlayEl.classList.remove("visible");

    for (const mesh of moteMeshes.values()) scene.remove(mesh);
    moteMeshes.clear();
    for (const vis of shadeVisuals.values()) scene.remove(vis.group);
    shadeVisuals.clear();
  };

  const onKeyDown = (e: KeyboardEvent): void => {
    audio.unlock();
    if (e.code === "KeyM") {
      const muted = audio.toggleMute();
      if (hud.muteBtn) hud.muteBtn.textContent = muted ? "Âm thanh: Tắt (M)" : "Âm thanh: Bật (M)";
      return;
    }
    if (e.code === "KeyR") {
      resetGame();
      return;
    }
    if (e.code === "KeyC") {
      camYawDeg = 0;
      return;
    }
    keys.add(e.code);
  };

  const onKeyUp = (e: KeyboardEvent): void => {
    keys.delete(e.code);
  };

  const onPointerDown = (e: PointerEvent): void => {
    audio.unlock();
    dragging = true;
    lastPointerX = e.clientX;
  };

  const onPointerMove = (e: PointerEvent): void => {
    if (!dragging) return;
    const dx = e.clientX - lastPointerX;
    lastPointerX = e.clientX;
    camYawDeg = (camYawDeg - dx * 0.35) % 360;
  };

  const onPointerUp = (): void => {
    dragging = false;
  };

  const onResize = (): void => {
    const w = container.clientWidth;
    const h = Math.max(1, container.clientHeight);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("resize", onResize);

  const onMuteClick = (): void => {
    audio.unlock();
    const muted = audio.toggleMute();
    if (hud.muteBtn) hud.muteBtn.textContent = muted ? "Âm thanh: Tắt (M)" : "Âm thanh: Bật (M)";
  };
  hud.muteBtn?.addEventListener("click", onMuteClick);
  hud.restartBtn?.addEventListener("click", resetGame);
  hud.replayBtn?.addEventListener("click", resetGame);

  let accumulator = 0;
  let lastPerf = performance.now();
  let rafId = 0;
  const startPerf = lastPerf;

  const animate = (now: number): void => {
    const frameDt = Math.min(0.1, (now - lastPerf) / 1000);
    lastPerf = now;
    const elapsedSec = (now - startPerf) / 1000;

    if (keys.has("KeyJ")) camYawDeg = (camYawDeg + 120 * frameDt) % 360;
    if (keys.has("KeyL")) camYawDeg = (camYawDeg - 120 * frameDt) % 360;

    const inputState = sampleInput(keys, camYawDeg);

    accumulator += frameDt;
    while (accumulator >= FIXED_DT) {
      if (sim.state === "playing") {
        const events = sim.step(inputState);
        for (const ev of events) {
          if (ev.name === "mote_picked") audio.playPickup();
          else if (ev.name === "deposit") {
            const litNow = sim.lanterns.find((l) => l.id === ev.data.lantern_id)?.lit ?? false;
            audio.playDeposit(litNow);
          } else if (ev.name === "pulse") {
            audio.playPulse();
            pulseAnimRemaining = 0.45;
            pulseRing.position.set(sim.player.pos[0], 0.1, sim.player.pos[2]);
            pulseRing.visible = true;
          } else if (ev.name === "player_hit") {
            audio.playHit();
          } else if (ev.name === "game_over") {
            audio.playGameOver(ev.data.result === "won");
          }
        }
      }
      accumulator -= FIXED_DT;
    }

    decor.update(elapsedSec);
    syncVisuals(
      sim,
      elapsedSec,
      frameDt,
      playerGroup,
      lanternVisuals,
      moteMeshes,
      shadeVisuals,
      scene,
      moteGeo,
      moteMat,
      ambientLight,
      fog,
      darkSky,
      dawnSky
    );

    if (pulseAnimRemaining > 0) {
      pulseAnimRemaining = Math.max(0, pulseAnimRemaining - frameDt);
      const t = 1 - pulseAnimRemaining / 0.45;
      const radius = 0.8 + t * sim.tuning.pulse_radius;
      pulseRing.scale.set(radius, radius, 1);
      pulseRingMat.opacity = (1 - t) * 0.75;
      if (pulseAnimRemaining === 0) pulseRing.visible = false;
    }

    updateThirdPersonCamera(camera, sim.player.pos, camYawDeg);
    updateHud(sim, hud);

    if (sim.state !== "playing" && !endOverlayShown) {
      endOverlayShown = true;
      showEndOverlay(sim, hud);
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(animate);
  };

  rafId = requestAnimationFrame(animate);

  return () => {
    cancelAnimationFrame(rafId);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    renderer.domElement.removeEventListener("pointerdown", onPointerDown);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("resize", onResize);
    hud.muteBtn?.removeEventListener("click", onMuteClick);
    hud.restartBtn?.removeEventListener("click", resetGame);
    hud.replayBtn?.removeEventListener("click", resetGame);
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };
}

function sampleInput(keys: Set<string>, camYawDeg: number): ActiveInputState {
  const forward = keys.has("KeyW") || keys.has("ArrowUp");
  const backward = keys.has("KeyS") || keys.has("ArrowDown");
  const right = keys.has("KeyD") || keys.has("ArrowRight");
  const left = keys.has("KeyA") || keys.has("ArrowLeft");

  // Camera looks along (+sin(yaw), +cos(yaw)); screen-right corresponds to -X at yaw=0.
  const mx = (left ? 1 : 0) - (right ? 1 : 0);
  const mz = (forward ? 1 : 0) - (backward ? 1 : 0);

  return {
    move: [mx, mz],
    cam_yaw_deg: camYawDeg,
    jump: keys.has("Space"),
    interact: keys.has("KeyE") || keys.has("KeyF"),
    pulse: keys.has("KeyQ") || keys.has("ShiftLeft") || keys.has("ShiftRight"),
    dash: false,
  };
}

function buildMayMesh(): {
  root: THREE.Group;
  miniLantern: THREE.Mesh;
  miniLight: THREE.PointLight;
} {
  const root = new THREE.Group();

  const cloak = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.95, 14),
    new THREE.MeshStandardMaterial({ color: 0x3b4d7a, roughness: 0.75 })
  );
  cloak.position.y = 0.48;
  root.add(cloak);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 14, 14),
    new THREE.MeshStandardMaterial({ color: 0xf6d8bc, roughness: 0.8 })
  );
  head.position.y = 1.08;
  root.add(head);

  // Non La (traditional conical hat)
  const nonLa = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.34, 20),
    new THREE.MeshStandardMaterial({ color: 0xdec07b, roughness: 0.85 })
  );
  nonLa.position.y = 1.32;
  root.add(nonLa);

  // Small lantern hanging from the front brim of the Non La
  const miniLantern = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffd57e,
      emissive: 0xff9d2e,
      emissiveIntensity: 1.8,
    })
  );
  miniLantern.position.set(0, 1.08, 0.52);
  root.add(miniLantern);

  const miniLight = new THREE.PointLight(0xffb452, 2.2, 7.5);
  miniLight.position.set(0, 1.1, 0.55);
  root.add(miniLight);

  return { root, miniLantern, miniLight };
}

function buildLanternVisual(safeRadius: number, cost: number): LanternVisual {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x3b4358, roughness: 0.88 })
  );
  base.position.y = 0.25;
  group.add(base);

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.3, 1.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x4b556e, roughness: 0.85 })
  );
  pillar.position.y = 1.35;
  group.add(pillar);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.92, 0.52, 8),
    new THREE.MeshStandardMaterial({ color: 0x353c4f, roughness: 0.85 })
  );
  roof.position.y = 2.85;
  group.add(roof);

  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x262b38,
    emissive: 0xff9a2a,
    emissiveIntensity: 0.1,
    roughness: 0.4,
  });
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.48, 0), coreMat);
  core.position.y = 2.35;
  group.add(core);

  const light = new THREE.PointLight(0xffb04a, 0, 18);
  light.position.y = 2.5;
  group.add(light);

  const safeRing = new THREE.Mesh(
    new THREE.RingGeometry(safeRadius - 0.12, safeRadius, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffbe5c,
      transparent: true,
      opacity: 0.32,
      side: THREE.DoubleSide,
    })
  );
  safeRing.rotation.x = -Math.PI / 2;
  safeRing.position.y = 0.04;
  safeRing.visible = false;
  group.add(safeRing);

  const pips: THREE.Mesh[] = [];
  for (let i = 0; i < cost; i += 1) {
    const pip = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x3b4254,
        emissive: 0xffab3b,
        emissiveIntensity: 0,
      })
    );
    const angle = (i / cost) * Math.PI * 2;
    pip.position.set(Math.cos(angle) * 0.72, 1.55, Math.sin(angle) * 0.72);
    group.add(pip);
    pips.push(pip);
  }

  return { group, core, coreMat, light, safeRing, pips };
}

function buildShadeVisual(): ShadeVisual {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x160a24,
    emissive: 0x3b0f6b,
    emissiveIntensity: 0.65,
    roughness: 0.45,
  });
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), bodyMat);
  group.add(body);

  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0xe688ff,
    emissive: 0xd04bff,
    emissiveIntensity: 1.8,
  });
  for (const xOff of [-0.17, 0.17]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), eyeMat);
    eye.position.set(xOff, 0.14, 0.44);
    group.add(eye);
  }

  const wisps: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), bodyMat);
    group.add(wisp);
    wisps.push(wisp);
  }

  return { group, bodyMat, eyeMat, wisps };
}

function syncVisuals(
  sim: GameSimulation,
  elapsedSec: number,
  _dt: number,
  playerGroup: { root: THREE.Group; miniLantern: THREE.Mesh; miniLight: THREE.PointLight },
  lanternVisuals: Map<string, LanternVisual>,
  moteMeshes: Map<string, THREE.Mesh>,
  shadeVisuals: Map<string, ShadeVisual>,
  scene: THREE.Scene,
  moteGeo: THREE.SphereGeometry,
  moteMat: THREE.MeshStandardMaterial,
  ambientLight: THREE.AmbientLight,
  fog: THREE.FogExp2,
  darkSky: THREE.Color,
  dawnSky: THREE.Color
): void {
  playerGroup.root.position.set(sim.player.pos[0], sim.player.pos[1], sim.player.pos[2]);
  playerGroup.root.rotation.y = sim.player.facingYawRad;
  playerGroup.miniLantern.position.x = Math.sin(elapsedSec * 4) * 0.04;
  playerGroup.root.visible = sim.invulnTicks > 0 ? Math.floor(elapsedSec * 16) % 2 === 0 : true;

  let litCount = 0;
  for (const lantern of sim.lanterns) {
    if (lantern.lit) litCount += 1;
    const vis = lanternVisuals.get(lantern.id);
    if (!vis) continue;

    vis.core.rotation.y = elapsedSec * (lantern.lit ? 1.4 : 0.3);
    if (lantern.lit) {
      vis.coreMat.color.setHex(0xffe096);
      vis.coreMat.emissiveIntensity = 2.0 + Math.sin(elapsedSec * 4) * 0.25;
      vis.light.intensity = 6.5;
      vis.safeRing.visible = true;
    } else {
      const ratio = lantern.deposited / Math.max(1, sim.tuning.lantern_cost);
      vis.coreMat.color.setHex(0x2d3345);
      vis.coreMat.emissiveIntensity = 0.1 + ratio * 0.9;
      vis.light.intensity = ratio * 1.8;
      vis.safeRing.visible = false;
    }
    vis.pips.forEach((pip, idx) => {
      const mat = pip.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = idx < lantern.deposited ? 1.5 : 0;
    });
  }

  // Island gets warmer and brighter as lanterns are lit
  const litRatio = litCount / Math.max(1, sim.lanterns.length);
  const skyColor = darkSky.clone().lerp(dawnSky, litRatio * 0.85);
  scene.background = skyColor;
  fog.color.copy(skyColor);
  fog.density = 0.029 - litRatio * 0.013;
  ambientLight.intensity = 0.6 + litRatio * 0.75;

  // Sync motes
  const activeMoteIds = new Set<string>();
  for (const mote of sim.motes) {
    activeMoteIds.add(mote.id);
    let mesh = moteMeshes.get(mote.id);
    if (!mesh) {
      mesh = new THREE.Mesh(moteGeo, moteMat);
      scene.add(mesh);
      moteMeshes.set(mote.id, mesh);
    }
    const hoverY = 0.65 + Math.sin(elapsedSec * 3.2 + mote.pos[0]) * 0.16;
    mesh.position.set(mote.pos[0], hoverY, mote.pos[2]);
  }
  for (const [id, mesh] of moteMeshes.entries()) {
    if (!activeMoteIds.has(id)) {
      scene.remove(mesh);
      moteMeshes.delete(id);
    }
  }

  // Sync shades
  const activeShadeIds = new Set<string>();
  for (const shade of sim.shades) {
    activeShadeIds.add(shade.id);
    let vis = shadeVisuals.get(shade.id);
    if (!vis) {
      vis = buildShadeVisual();
      scene.add(vis.group);
      shadeVisuals.set(shade.id, vis);
    }
    const bob = Math.sin(elapsedSec * 4.5 + shade.pos[0]) * 0.12;
    vis.group.position.set(shade.pos[0], shade.pos[1] + bob, shade.pos[2]);
    const dx = sim.player.pos[0] - shade.pos[0];
    const dz = sim.player.pos[2] - shade.pos[2];
    vis.group.rotation.y = shade.state === "stunned" ? elapsedSec * 10 : Math.atan2(dx, dz);

    if (shade.state === "stunned") {
      vis.bodyMat.color.setHex(0x65557a);
      vis.bodyMat.emissive.setHex(0x886eb0);
      vis.eyeMat.emissive.setHex(0xffffff);
    } else {
      vis.bodyMat.color.setHex(0x160a24);
      vis.bodyMat.emissive.setHex(0x3b0f6b);
      vis.eyeMat.emissive.setHex(0xd04bff);
    }

    vis.wisps.forEach((wisp, idx) => {
      const a = elapsedSec * 3 + (idx * Math.PI * 2) / 3;
      wisp.position.set(Math.cos(a) * 0.65, Math.sin(a * 1.3) * 0.2, Math.sin(a) * 0.65);
    });
  }
  for (const [id, vis] of shadeVisuals.entries()) {
    if (!activeShadeIds.has(id)) {
      scene.remove(vis.group);
      shadeVisuals.delete(id);
    }
  }
}

function updateThirdPersonCamera(
  camera: THREE.PerspectiveCamera,
  playerPos: readonly [number, number, number],
  camYawDeg: number
): void {
  const theta = (camYawDeg * Math.PI) / 180;
  const dist = 10.5;
  const height = 5.4;
  const targetX = playerPos[0] - Math.sin(theta) * dist;
  const targetZ = playerPos[2] - Math.cos(theta) * dist;

  camera.position.lerp(new THREE.Vector3(targetX, playerPos[1] + height, targetZ), 0.16);
  camera.lookAt(playerPos[0], playerPos[1] + 1.1, playerPos[2]);
}

function updateHud(sim: GameSimulation, hud: GameHudRefs): void {
  const litCount = sim.lanterns.filter((l) => l.lit).length;
  if (hud.lanternsEl) hud.lanternsEl.textContent = `${litCount} / ${sim.lanterns.length}`;
  if (hud.flamesEl) {
    hud.flamesEl.textContent = `${sim.player.flames} / ${sim.tuning.flames}`;
    hud.flamesEl.className = sim.player.flames <= 1 ? "stat-val danger" : "stat-val";
  }
  if (hud.carriedEl) hud.carriedEl.textContent = `${sim.player.carried} / ${sim.tuning.carry_capacity}`;
  if (hud.scoreEl) hud.scoreEl.textContent = String(sim.score);

  if (hud.timeEl) {
    const secs = Math.ceil(sim.rawTimeLeftS);
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    hud.timeEl.textContent = `${mm}:${ss}`;
  }

  if (hud.promptEl) {
    const nearLantern = sim.findInteractableLantern();
    if (nearLantern) {
      const need = sim.tuning.lantern_cost - nearLantern.deposited;
      if (sim.player.carried > 0) {
        hud.promptEl.textContent = `Gần Đèn ${nearLantern.id} (cần ${need} đom đóm) — Nhấn [E] để nạp sáng!`;
      } else {
        hud.promptEl.textContent = `Đèn ${nearLantern.id} cần thêm ${need} đom đóm. Hãy tìm đom đóm vàng quanh đảo!`;
      }
    } else if (sim.pulseCooldownTicks > 0) {
      const cd = (sim.pulseCooldownTicks / TICK_RATE).toFixed(1);
      hud.promptEl.textContent = `Tỏa sáng [Q] hồi chiêu: ${cd}s`;
    } else if (sim.player.carried >= sim.tuning.pulse_cost) {
      hud.promptEl.textContent = `Sẵn sàng Tỏa sáng [Q] (tốn 1 đom đóm) để xua Bóng Mực!`;
    } else {
      hud.promptEl.textContent = `Thu thập đom đóm vàng và thắp sáng toàn bộ 5 Đèn Lồng Lớn!`;
    }
  }
}

function showEndOverlay(sim: GameSimulation, hud: GameHudRefs): void {
  if (!hud.overlayEl) return;
  hud.overlayEl.classList.add("visible");

  if (hud.overlayTitleEl) {
    hud.overlayTitleEl.textContent = sim.state === "won" ? "Đảo Bến bừng sáng!" : "Đêm tối nuốt chửng...";
  }
  if (hud.overlaySubtitleEl) {
    if (sim.gameOverReason === "all_lit") {
      hud.overlaySubtitleEl.textContent = "Mây đã thắp sáng đủ 5 Đèn Lồng Lớn trước bình minh!";
    } else if (sim.gameOverReason === "no_flames") {
      hud.overlaySubtitleEl.textContent = "Mây đã mất hết ngọn lửa vì chạm Bóng Mực.";
    } else {
      hud.overlaySubtitleEl.textContent = "Bình minh đã tới trước khi tất cả Đèn Lồng được thắp sáng.";
    }
  }
  if (hud.overlayBreakdownEl) {
    const b = sim.scoreBreakdown;
    hud.overlayBreakdownEl.innerHTML = `
      <div><span>Đom đóm nhặt được</span><span>+${b.motes}</span></div>
      <div><span>Thắp Đèn Lồng Lớn</span><span>+${b.lanterns}</span></div>
      <div><span>Xua tan Bóng Mực</span><span>+${b.stuns}</span></div>
      <div><span>Thưởng thời gian còn lại</span><span>+${b.timeBonus}</span></div>
      <div><span>Thưởng ngọn lửa còn lại</span><span>+${b.flameBonus}</span></div>
      <div id="overlay-total"><span>Tổng điểm</span><span>${sim.score}</span></div>
    `;
  }
}
