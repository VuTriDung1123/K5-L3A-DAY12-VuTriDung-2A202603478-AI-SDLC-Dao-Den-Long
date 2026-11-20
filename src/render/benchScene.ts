import * as THREE from "three";
import {
  BENCH_WARMUP_S,
  BenchSimulation,
  computeBenchStats,
  getBenchCameraPosition,
} from "../core/benchSim.js";
import { FIXED_DT } from "../core/config.js";

/**
 * Standardized Ticket-04 Benchmark Renderer (1280x720):
 * - Night 1 island with full standard lighting (L1..L3 lit fuel 100, L4..L5 unlit)
 * - 200 wandering Shades + 100 Motes via InstancedMesh for optimal GPU throughput
 * - Extra creative decorations disabled per Ticket-04 rules
 * - Camera orbits r=30, Y=15 CCW from (30,15,0) at 15s/rev looking at (0,0,0)
 * - 3s warmup, then measures `durationSec`, POSTs JSON stats to /api/bench-result
 */
export function runBenchScene(container: HTMLElement, seed: number, durationSec: number): void {
  const sim = new BenchSimulation(seed);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1430);
  scene.fog = new THREE.FogExp2(0x1b2350, 0.013);

  const width = container.clientWidth || 1280;
  const height = container.clientHeight || 720;
  const camera = new THREE.PerspectiveCamera(56, width / Math.max(1, height), 0.1, 260);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(1); // Deterministic 1280x720 benchmark resolution
  container.appendChild(renderer.domElement);

  // Detect WebGL renderer info for bench.json
  const gl = renderer.getContext();
  let gpuName = "WebGL2";
  const debugExt = gl.getExtension("WEBGL_debug_renderer_info");
  if (debugExt) {
    const unmasked = gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL);
    if (typeof unmasked === "string" && unmasked.length > 0) {
      gpuName = unmasked;
    }
  }
  const rendererDesc = `Three.js r${THREE.REVISION} WebGL2 (${gpuName})`;

  // Standard Night 1 lighting with 3/5 lanterns lit: intensity = 0.15 + 0.55 * (3/5) = 0.48
  scene.add(new THREE.AmbientLight(0xffffff, 0.48));
  scene.add(new THREE.HemisphereLight(0x9fb4ff, 0x162238, 0.45));
  const moon = new THREE.DirectionalLight(0xd2ddff, 0.65);
  moon.position.set(25, 42, -20);
  scene.add(moon);

  // Night 1 Island (standard geometry, creative props disabled for fair benchmark)
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x2f5d50, roughness: 0.9 });
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xc9b48a, roughness: 0.88 });
  const island = new THREE.Mesh(new THREE.CylinderGeometry(40, 41.2, 1.6, 48), grassMat);
  island.position.y = -0.8;
  scene.add(island);

  const rim = new THREE.Mesh(new THREE.RingGeometry(38.7, 40, 48), sandMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.02;
  scene.add(rim);

  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(200, 36),
    new THREE.MeshStandardMaterial({ color: 0x12384a, roughness: 0.95 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -10.5;
  scene.add(sea);

  // Idle May at (0,0,0)
  const mayGroup = new THREE.Group();
  const coat = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.95, 14),
    new THREE.MeshStandardMaterial({ color: 0xe8e2d0 })
  );
  coat.position.y = 0.48;
  mayGroup.add(coat);
  const hat = new THREE.Mesh(
    new THREE.ConeGeometry(0.62, 0.34, 16),
    new THREE.MeshStandardMaterial({ color: 0xc9b48a })
  );
  hat.position.y = 1.34;
  mayGroup.add(hat);
  const mayLight = new THREE.PointLight(0xffb347, 2.2, 8);
  mayLight.position.set(0, 1.1, 0.55);
  mayGroup.add(mayLight);
  scene.add(mayGroup);

  // 5 Great Lanterns (L1..L3 lit fuel 100 + PointLights + Safe Rings; L4..L5 unlit)
  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.38, 2.1, 8);
  const roofGeo = new THREE.ConeGeometry(0.95, 0.52, 8);
  const coreGeo = new THREE.OctahedronGeometry(0.5, 0);
  const safeGeo = new THREE.RingGeometry(5.86, 6.0, 40);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x5b5f6e });
  const litCoreMat = new THREE.MeshStandardMaterial({
    color: 0xffe9b0,
    emissive: 0xffb347,
    emissiveIntensity: 1.9,
  });
  const unlitCoreMat = new THREE.MeshStandardMaterial({ color: 0x5b5f6e });
  const safeMat = new THREE.MeshBasicMaterial({
    color: 0xf2c14e,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
  });

  for (const l of sim.lanterns) {
    const g = new THREE.Group();
    g.position.set(l.pos[0], l.pos[1], l.pos[2]);
    const p = new THREE.Mesh(pillarGeo, pillarMat);
    p.position.y = 1.05;
    g.add(p);
    const core = new THREE.Mesh(coreGeo, l.lit ? litCoreMat : unlitCoreMat);
    core.position.y = 2.45;
    if (!l.lit) core.scale.set(0.8, 0.8, 0.8);
    g.add(core);
    const roof = new THREE.Mesh(roofGeo, pillarMat);
    roof.position.y = 2.95;
    g.add(roof);
    if (l.lit) {
      const pt = new THREE.PointLight(0xffb347, 7.5, 20);
      pt.position.y = 2.5;
      g.add(pt);
      const sr = new THREE.Mesh(safeGeo, safeMat);
      sr.rotation.x = -Math.PI / 2;
      sr.position.y = 0.05;
      g.add(sr);
    }
    scene.add(g);
  }

  // 200 Shades rendered via InstancedMesh
  const shadeBodyMesh = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({
      color: 0x120a1a,
      emissive: 0x7a3cff,
      emissiveIntensity: 0.45,
    }),
    sim.shades.length
  );
  scene.add(shadeBodyMesh);

  // 100 Motes rendered via InstancedMesh
  const moteMesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.24, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xfff6c2,
      emissive: 0xffe58a,
      emissiveIntensity: 1.7,
    }),
    sim.motes.length
  );
  scene.add(moteMesh);

  const dummy = new THREE.Object3D();
  const syncInstances = (elapsedSec: number): void => {
    for (let i = 0; i < sim.shades.length; i += 1) {
      const s = sim.shades[i];
      dummy.position.set(s.pos[0], s.pos[1] + Math.sin(elapsedSec * 4 + i) * 0.08, s.pos[2]);
      dummy.rotation.set(0, s.wanderAngle, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      shadeBodyMesh.setMatrixAt(i, dummy.matrix);
    }
    shadeBodyMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < sim.motes.length; i += 1) {
      const m = sim.motes[i];
      dummy.position.set(m.pos[0], 0.65 + Math.sin(elapsedSec * 3 + i) * 0.14, m.pos[2]);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      moteMesh.setMatrixAt(i, dummy.matrix);
    }
    moteMesh.instanceMatrix.needsUpdate = true;
  };

  // Bench status HUD badge
  const statusEl = document.createElement("div");
  statusEl.style.cssText =
    "position:fixed;top:12px;left:12px;padding:8px 14px;background:rgba(14,20,48,0.85);border:1px solid #f2c14e;border-radius:10px;color:#f5f1e6;font:700 18px system-ui;z-index:100;";
  statusEl.textContent = `BENCHMARK · Seed ${seed} · Warmup ${BENCH_WARMUP_S}s`;
  document.body.appendChild(statusEl);

  let firstFrameSent = false;
  let startTimeMs = 0;
  let lastFrameMs = 0;
  let accumulator = 0;
  const frameDtsMs: number[] = [];
  let finished = false;

  const animate = (now: number): void => {
    if (finished) return;
    if (startTimeMs === 0) {
      startTimeMs = now;
      lastFrameMs = now;
    }

    const dtMs = now - lastFrameMs;
    lastFrameMs = now;
    const elapsedSec = (now - startTimeMs) / 1000;

    accumulator += Math.min(0.1, dtMs / 1000);
    while (accumulator >= FIXED_DT) {
      sim.step();
      accumulator -= FIXED_DT;
    }

    syncInstances(elapsedSec);
    const camPos = getBenchCameraPosition(elapsedSec);
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);

    if (!firstFrameSent) {
      firstFrameSent = true;
      void fetch("/api/bench-first-frame", { method: "POST" }).catch(() => {});
    }

    if (elapsedSec >= BENCH_WARMUP_S) {
      if (dtMs > 0) {
        frameDtsMs.push(dtMs);
      }
      const measElapsed = elapsedSec - BENCH_WARMUP_S;
      statusEl.textContent = `BENCHMARK · Measuring ${measElapsed.toFixed(1)}s / ${durationSec}s · Frames: ${frameDtsMs.length}`;

      if (measElapsed >= durationSec) {
        finished = true;
        const stats = computeBenchStats(frameDtsMs);
        statusEl.textContent = `DONE · Avg ${stats.avg_fps} FPS · 1% Low ${stats.p1_low_fps} FPS`;
        void fetch("/api/bench-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...stats,
            renderer: rendererDesc,
            peak_mem_mb: null,
          }),
        }).catch(() => {});
        return;
      }
    }

    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}
