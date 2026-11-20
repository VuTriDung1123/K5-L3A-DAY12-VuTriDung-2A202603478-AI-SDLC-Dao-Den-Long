import * as THREE from "three";
import type { NightMapConfig } from "../core/maps.js";
import type { WindState } from "../core/types.js";

export interface WorldVisualHandle {
  group: THREE.Group;
  update(elapsedSec: number, wind: WindState, reducedMotion?: boolean): void;
  dispose(): void;
}

const COLORS = {
  grass: 0x2f5d50,
  grassLush: 0x3b7362,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  woodDark: 0x452d1b,
  sea: 0x12384a,
  gold: 0xf2c14e,
  amber: 0xffb347,
  stone: 0x4b5366,
  toriiRed: 0xc8102e,
  sakuraPink: 0xffb7d5,
  shojiWarm: 0xffe9b0,
  bamboo: 0x4b875e,
};

/**
 * Builds the atmospheric Japanese-village-inspired 3D environment for Nights 1, 2, and 3:
 * vermilion Torii gates, wooden shrine houses with glowing shoji windows, cherry blossom trees,
 * bamboo groves, stone lanterns, fallen mossy logs, boulders, lotus streams, drifting sakura petals,
 * ambient firefly dust, starfield sky dome, and wind-swaying foliage.
 */
export function buildNightWorld(scene: THREE.Scene, map: NightMapConfig): WorldVisualHandle {
  const group = new THREE.Group();
  scene.add(group);

  const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.9 });
  const lushMat = new THREE.MeshStandardMaterial({ color: COLORS.grassLush, roughness: 0.82 });
  const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.88 });
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.84 });
  const woodDarkMat = new THREE.MeshStandardMaterial({ color: COLORS.woodDark, roughness: 0.86 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.88 });
  const toriiMat = new THREE.MeshStandardMaterial({ color: COLORS.toriiRed, roughness: 0.55 });
  const sakuraMat = new THREE.MeshStandardMaterial({
    color: COLORS.sakuraPink,
    emissive: 0x5c223c,
    emissiveIntensity: 0.25,
    roughness: 0.78,
  });
  const bambooMat = new THREE.MeshStandardMaterial({ color: COLORS.bamboo, roughness: 0.75 });
  const padMat = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    emissive: COLORS.amber,
    emissiveIntensity: 1.15,
  });

  // Starfield sky dome
  const starPositions = new Float32Array(220 * 3);
  const seaCenter = map.night === 2 ? 35 : 0;
  for (let i = 0; i < 220; i += 1) {
    const theta = (i * 2.39996) % (Math.PI * 2);
    const phi = 0.14 + ((i * 7) % 52) * 0.011;
    const r = 160;
    starPositions[i * 3] = seaCenter + r * Math.cos(theta) * Math.cos(phi);
    starPositions[i * 3 + 1] = 16 + r * Math.sin(phi);
    starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  group.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({ color: 0xfff6c2, size: 1.15, transparent: true, opacity: 0.88 })
    )
  );

  // Cloud sea floor + animated mist rings
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(240, 48),
    new THREE.MeshStandardMaterial({ color: COLORS.sea, roughness: 0.9 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(seaCenter, -10.5, 0);
  group.add(sea);

  const mistRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(47 + i * 16, 52 + i * 16, 48),
      new THREE.MeshBasicMaterial({
        color: 0x264b63,
        transparent: true,
        opacity: 0.24 - i * 0.05,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(seaCenter, -2.5 - i * 1.2, 0);
    group.add(ring);
    mistRings.push(ring);
  }

  const swayingFoliage: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }> = [];
  const waterRipples: THREE.Mesh[] = [];

  if (map.night === 1) {
    addCircularIsland(group, 0, 0, 40, grassMat, sandMat, stoneMat);
    addStonePathsToLanterns(group, 0, 0, map.lanterns, stoneMat);

    // Wooden dock + Vermilion Torii gate framing entrance
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 7.2), woodMat);
    pier.position.set(0, -0.05, -42.5);
    group.add(pier);
    addToriiGate(group, 0, 0, -37.2, 0, toriiMat, woodDarkMat);

    // Traditional wooden shrine houses nestled near the scenic outer edge (clear of lanterns)
    addShrineHouse(group, -28, 0, -18, 0.65, woodMat, woodDarkMat);
    addShrineHouse(group, 27, 0, -21, -0.75, woodMat, woodDarkMat);

    // Shimmering forest pond near east-south cove
    const pond = addPond(group, 22, 0.03, -6, 3.6, stoneMat);
    waterRipples.push(pond);

    // Sakura trees, bamboo groves, stone Toro lanterns, logs, and dense swaying grass
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2 + 0.28;
      const r = i % 2 === 0 ? 17.5 : 31.5;
      const tx = Math.cos(a) * r;
      const tz = Math.sin(a) * r;
      if (map.lanterns.some((l) => Math.hypot(l.pos[0] - tx, l.pos[2] - tz) < 4.8)) continue;
      if (Math.hypot(tx - 22, tz + 6) < 4.5) continue;
      const tree =
        i % 3 === 0
          ? addSakuraTree(group, tx, 0, tz, woodDarkMat, sakuraMat)
          : i % 3 === 1
            ? addBambooCluster(group, tx, 0, tz, bambooMat, lushMat)
            : addWillowTree(group, tx, 0, tz, woodMat, lushMat);
      swayingFoliage.push({ obj: tree, phase: i * 0.8, baseRotZ: 0 });
    }
    addStoneToro(group, -5.5, 0, -35.5, stoneMat);
    addStoneToro(group, 5.5, 0, -35.5, stoneMat);
    populateGrassLogsAndRocks(group, 0, 0, 36, 52, lushMat, stoneMat, woodDarkMat, swayingFoliage);
  } else if (map.night === 2) {
    addCircularIsland(group, 0, 0, 28, grassMat, sandMat, stoneMat);
    addCircularIsland(group, 70, 0, 28, grassMat, sandMat, stoneMat);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.28, 4), woodMat);
    bridge.position.set(35, -0.14, 0);
    group.add(bridge);
    for (let bx = 27; bx <= 43; bx += 4) {
      for (const bz of [-1.85, 1.85]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.72, 6), woodMat);
        post.position.set(bx, 0.26, bz);
        group.add(post);
      }
    }
    // Red Torii gates framing both ends of the bamboo bridge
    addToriiGate(group, 26.2, 0, 0, Math.PI / 2, toriiMat, woodDarkMat);
    addToriiGate(group, 43.8, 0, 0, Math.PI / 2, toriiMat, woodDarkMat);
    addShrineHouse(group, -18, 0, 14, 0.8, woodMat, woodDarkMat);
    addShrineHouse(group, 86, 0, 13, -0.85, woodMat, woodDarkMat);

    for (const [cx, cz, kind] of [
      [-15, 11, 0],
      [13, 14, 1],
      [-11, -17, 2],
      [56, 15, 0],
      [83, 12, 1],
      [81, -15, 2],
    ]) {
      const tree =
        kind === 0
          ? addSakuraTree(group, cx, 0, cz, woodDarkMat, sakuraMat)
          : kind === 1
            ? addBambooCluster(group, cx, 0, cz, bambooMat, lushMat)
            : addPalmTree(group, cx, 0, cz, woodMat, lushMat);
      swayingFoliage.push({ obj: tree, phase: cx * 0.2, baseRotZ: 0 });
    }
    populateGrassLogsAndRocks(group, 0, 0, 24, 30, lushMat, stoneMat, woodDarkMat, swayingFoliage);
    populateGrassLogsAndRocks(group, 70, 0, 24, 30, lushMat, stoneMat, woodDarkMat, swayingFoliage);
  } else {
    // Night 3: Tier 0 (r=45, Y=0)
    addCircularIsland(group, 0, 0, 45, grassMat, sandMat, stoneMat);

    // Tier 1: Elevated half-annulus deck r=12..24, z > 0, Y=3
    const tier1Cap = new THREE.Mesh(new THREE.RingGeometry(12, 24, 36, 1, 0, Math.PI), grassMat);
    tier1Cap.rotation.x = -Math.PI / 2;
    tier1Cap.position.y = 3;
    group.add(tier1Cap);

    const tier1Lip = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 0.38, 36, 1, true, Math.PI / 2, Math.PI),
      sandMat
    );
    tier1Lip.position.y = 2.82;
    tier1Lip.rotation.y = -Math.PI / 2;
    group.add(tier1Lip);

    for (const deg of [25, 65, 115, 155]) {
      const rad = (deg * Math.PI) / 180;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.48, 3, 8), stoneMat);
      col.position.set(18 * Math.cos(rad), 1.5, 18 * Math.sin(rad));
      group.add(col);
    }
    for (const deg of [45, 135, 225, 315]) {
      const rad = (deg * Math.PI) / 180;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 6, 8), stoneMat);
      col.position.set(6.5 * Math.cos(rad), 3.0, 6.5 * Math.sin(rad));
      group.add(col);
    }

    // Two straight radial ramps at 30 deg and 150 deg (r=30 Y=0 to r=24 Y=3, width 3m) + Torii arches at foot
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rampLen = Math.hypot(6, 3);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.32, 3), woodMat);
      const midR = 27;
      ramp.position.set(midR * Math.cos(rad), 1.5 - 0.15, midR * Math.sin(rad));
      ramp.rotation.order = "YXZ";
      ramp.rotation.y = -rad;
      ramp.rotation.z = -Math.atan2(3, 6);
      group.add(ramp);
      addToriiGate(group, 31 * Math.cos(rad), 0, 31 * Math.sin(rad), -rad + Math.PI / 2, toriiMat, woodDarkMat);
    }

    // Tier 2: Central plateau r=8, Y=6
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.45, 32), grassMat);
    tier2.position.y = 5.775;
    group.add(tier2);
    const tier2Rim = new THREE.Mesh(new THREE.RingGeometry(7.5, 8, 32), sandMat);
    tier2Rim.rotation.x = -Math.PI / 2;
    tier2Rim.position.y = 6.02;
    group.add(tier2Rim);

    // Ornate Central Bell Tower (radius 2m, height 8m on top of Tier 2)
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.0, 8, 16), woodMat);
    tower.position.set(0, 10, 0);
    group.add(tower);
    const roofLower = new THREE.Mesh(new THREE.ConeGeometry(3.2, 1.4, 12), toriiMat);
    roofLower.position.set(0, 11.8, 0);
    group.add(roofLower);
    const roofUpper = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.0, 12), woodDarkMat);
    roofUpper.position.set(0, 14.9, 0);
    group.add(roofUpper);
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.72, 0.95, 12),
      new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.65, roughness: 0.25 })
    );
    bell.position.set(0, 13.2, 0);
    group.add(bell);

    addShrineHouse(group, -32, 0, -24, 0.7, woodMat, woodDarkMat);
    addShrineHouse(group, 32, 0, -24, -0.7, woodMat, woodDarkMat);

    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + 0.35;
      const tx = Math.cos(a) * 39;
      const tz = Math.sin(a) * 39;
      const tree =
        i % 2 === 0
          ? addSakuraTree(group, tx, 0, tz, woodDarkMat, sakuraMat)
          : addBambooCluster(group, tx, 0, tz, bambooMat, lushMat);
      swayingFoliage.push({ obj: tree, phase: i, baseRotZ: 0 });
    }
    populateGrassLogsAndRocks(group, 0, 0, 41, 50, lushMat, stoneMat, woodDarkMat, swayingFoliage);
  }

  // Jump Pads
  const padRings: THREE.Mesh[] = [];
  for (const pad of map.jumpPads) {
    const padMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(pad.radius, pad.radius * 1.15, 0.22, 24),
      padMat
    );
    padMesh.position.set(pad.pos[0], pad.pos[1] + 0.11, pad.pos[2]);
    group.add(padMesh);
    padRings.push(padMesh);
  }

  // Drifting sky lanterns outside islands
  const floaters: Array<{ mesh: THREE.Mesh; angle: number; radius: number; y: number }> = [];
  const floatGeo = new THREE.BoxGeometry(0.6, 0.85, 0.6);
  const floatMat = new THREE.MeshStandardMaterial({
    color: COLORS.amber,
    emissive: COLORS.amber,
    emissiveIntensity: 1.0,
  });
  for (let i = 0; i < 20; i += 1) {
    const mesh = new THREE.Mesh(floatGeo, floatMat);
    const angle = (i / 20) * Math.PI * 2;
    const radius = 55 + (i % 4) * 7;
    const y = 1.5 + (i % 5) * 1.6;
    group.add(mesh);
    floaters.push({ mesh, angle, radius, y });
  }

  // Drifting Sakura petals + ambient luminous dust particles
  const petals: THREE.Mesh[] = [];
  const petalGeo = new THREE.BoxGeometry(0.18, 0.03, 0.12);
  const petalMat = new THREE.MeshBasicMaterial({ color: COLORS.sakuraPink });
  for (let i = 0; i < 42; i += 1) {
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.position.set(
      seaCenter + ((i * 19) % 70) - 35,
      1.2 + (i % 8) * 1.1,
      ((i * 29) % 70) - 35
    );
    group.add(p);
    petals.push(p);
  }

  // Wind swirling gold leaves (visible during Night 3 warning/active wind)
  const leaves: THREE.Mesh[] = [];
  const leafGeo = new THREE.BoxGeometry(0.38, 0.05, 0.22);
  const leafMat = new THREE.MeshBasicMaterial({ color: COLORS.gold });
  for (let i = 0; i < 32; i += 1) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.visible = false;
    leaf.position.set(((i * 17) % 64) - 32, 1 + (i % 5) * 1.3, ((i * 23) % 64) - 32);
    group.add(leaf);
    leaves.push(leaf);
  }

  return {
    group,
    update(elapsedSec: number, wind: WindState, reducedMotion = false): void {
      const motionMult = reducedMotion ? 0.15 : 1.0;

      for (const pad of padRings) {
        pad.rotation.y = elapsedSec * 2.2 * motionMult;
      }
      mistRings.forEach((r, idx) => {
        const s = 1 + Math.sin(elapsedSec * 0.7 + idx) * 0.03 * motionMult;
        r.scale.set(s, s, 1);
      });
      for (const pond of waterRipples) {
        const s = 1 + Math.sin(elapsedSec * 2.1) * 0.02 * motionMult;
        pond.scale.set(s, s, 1);
      }
      for (const fl of floaters) {
        const a = fl.angle + elapsedSec * 0.03 * motionMult;
        fl.mesh.position.set(
          seaCenter + Math.cos(a) * fl.radius,
          fl.y + Math.sin(elapsedSec * 1.2 + fl.angle) * 0.5 * motionMult,
          Math.sin(a) * fl.radius
        );
      }

      // Gentle sakura petal drift
      for (let i = 0; i < petals.length; i += 1) {
        const pt = petals[i];
        pt.visible = !reducedMotion;
        if (reducedMotion) continue;
        pt.position.y -= 0.015;
        pt.position.x += Math.sin(elapsedSec + i) * 0.015;
        pt.rotation.z += 0.04;
        pt.rotation.y += 0.03;
        if (pt.position.y < 0.1) {
          pt.position.y = 7.5 + (i % 4);
        }
      }

      // Foliage sway
      const swayAmp = (wind.active ? 0.14 : wind.warning ? 0.08 : 0.035) * motionMult;
      const swayFreq = wind.active ? 5.5 : 2.1;
      for (const item of swayingFoliage) {
        item.obj.rotation.z = item.baseRotZ + Math.sin(elapsedSec * swayFreq + item.phase) * swayAmp;
      }

      const showWind = wind.active || wind.warning;
      const wRad = (wind.dirDeg * Math.PI) / 180;
      const speed = (wind.active ? 0.42 : 0.16) * (reducedMotion ? 0.4 : 1.0);
      for (let i = 0; i < leaves.length; i += 1) {
        const leaf = leaves[i];
        leaf.visible = showWind;
        if (!showWind) continue;
        leaf.position.x += Math.cos(wRad) * speed;
        leaf.position.z += Math.sin(wRad) * speed;
        leaf.rotation.y += 0.16;
        if (Math.hypot(leaf.position.x, leaf.position.z) > 46) {
          leaf.position.x = -Math.cos(wRad) * 35 + ((i % 7) - 3) * 4;
          leaf.position.z = -Math.sin(wRad) * 35 + ((i % 5) - 2) * 4;
        }
      }
    },
    dispose(): void {
      scene.remove(group);
    },
  };
}

function addCircularIsland(
  group: THREE.Group,
  cx: number,
  cz: number,
  radius: number,
  grassMat: THREE.Material,
  sandMat: THREE.Material,
  stoneMat: THREE.Material
): void {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 1.4, 1.8, 48), grassMat);
  base.position.set(cx, -0.9, cz);
  group.add(base);

  const rim = new THREE.Mesh(new THREE.RingGeometry(radius - 1.4, radius, 48), sandMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(cx, 0.02, cz);
  group.add(rim);

  const centerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.12, 24), stoneMat);
  centerPlinth.position.set(cx, 0.02, cz);
  group.add(centerPlinth);
}

function addStonePathsToLanterns(
  group: THREE.Group,
  cx: number,
  cz: number,
  lanterns: NightMapConfig["lanterns"],
  stoneMat: THREE.Material
): void {
  const stepGeo = new THREE.CylinderGeometry(0.55, 0.62, 0.07, 8);
  for (const l of lanterns) {
    const dx = l.pos[0] - cx;
    const dz = l.pos[2] - cz;
    const dist = Math.hypot(dx, dz);
    const steps = Math.floor(dist / 2.5);
    for (let s = 2; s < steps; s += 1) {
      const t = s / steps;
      const stone = new THREE.Mesh(stepGeo, stoneMat);
      stone.position.set(cx + dx * t + Math.sin(s * 1.4) * 0.25, 0.02, cz + dz * t);
      group.add(stone);
    }
  }
}

function addToriiGate(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotY: number,
  redMat: THREE.Material,
  darkMat: THREE.Material
): void {
  const gate = new THREE.Group();
  for (const sx of [-1.75, 1.75]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 4.1, 10), redMat);
    pillar.position.set(sx, 2.05, 0);
    gate.add(pillar);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.45, 10), darkMat);
    base.position.set(sx, 0.22, 0);
    gate.add(base);
  }
  const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.22, 0.26), redMat);
  lowerBeam.position.set(0, 3.2, 0);
  gate.add(lowerBeam);
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.28, 0.36), redMat);
  topBeam.position.set(0, 4.05, 0);
  gate.add(topBeam);
  const topCap = new THREE.Mesh(new THREE.BoxGeometry(5.3, 0.14, 0.44), darkMat);
  topCap.position.set(0, 4.24, 0);
  gate.add(topCap);

  gate.position.set(x, y, z);
  gate.rotation.y = rotY;
  group.add(gate);
}

function addShrineHouse(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotY: number,
  woodMat: THREE.Material,
  roofMat: THREE.Material
): void {
  const house = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.6, 3.4), woodMat);
  body.position.y = 1.3;
  house.add(body);

  const shojiMat = new THREE.MeshStandardMaterial({
    color: COLORS.shojiWarm,
    emissive: COLORS.amber,
    emissiveIntensity: 0.9,
  });
  const winFront = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.2), shojiMat);
  winFront.position.set(0, 1.35, 1.72);
  house.add(winFront);

  const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.8, 4), roofMat);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.4;
  house.add(roof);

  house.position.set(x, y, z);
  house.rotation.y = rotY;
  group.add(house);
}

function addStoneToro(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  stoneMat: THREE.Material
): void {
  const toro = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 1.2, 6), stoneMat);
  post.position.y = 0.6;
  toro.add(post);
  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.34, 0.32),
    new THREE.MeshStandardMaterial({
      color: COLORS.shojiWarm,
      emissive: COLORS.amber,
      emissiveIntensity: 1.4,
    })
  );
  glow.position.y = 1.35;
  toro.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.28, 6), stoneMat);
  cap.position.y = 1.66;
  toro.add(cap);
  toro.position.set(x, y, z);
  group.add(toro);
}

function addPond(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  radius: number,
  stoneMat: THREE.Material
): THREE.Mesh {
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 24),
    new THREE.MeshStandardMaterial({
      color: 0x1b637a,
      emissive: 0x0b2a38,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.35,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, y, z);
  group.add(water);

  const rockGeo = new THREE.DodecahedronGeometry(0.48, 0);
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2;
    const rock = new THREE.Mesh(rockGeo, stoneMat);
    rock.position.set(x + Math.cos(a) * radius, y + 0.15, z + Math.sin(a) * radius);
    rock.scale.set(1.2, 0.65, 1.0);
    group.add(rock);
  }
  return water;
}

function addSakuraTree(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  trunkMat: THREE.Material,
  blossomMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.36, 3.2, 8), trunkMat);
  trunk.position.y = 1.6;
  tree.add(trunk);

  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2;
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 - (i % 2) * 0.2, 0), blossomMat);
    puff.position.set(Math.cos(a) * 0.7, 3.1 + (i % 2) * 0.55, Math.sin(a) * 0.7);
    tree.add(puff);
  }
  tree.position.set(x, y, z);
  group.add(tree);
  return tree;
}

function addBambooCluster(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  stalkMat: THREE.Material,
  leafMat: THREE.Material
): THREE.Group {
  const grove = new THREE.Group();
  for (let i = 0; i < 4; i += 1) {
    const h = 3.6 + (i % 3) * 0.9;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, h, 6), stalkMat);
    stalk.position.set(((i % 2) - 0.5) * 0.6, h * 0.5, (Math.floor(i / 2) - 0.5) * 0.6);
    grove.add(stalk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.9, 6), leafMat);
    crown.position.set(stalk.position.x, h + 0.2, stalk.position.z);
    grove.add(crown);
  }
  grove.position.set(x, y, z);
  group.add(grove);
  return grove;
}

function addWillowTree(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  trunkMat: THREE.Material,
  leafMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 2.8, 8), trunkMat);
  trunk.position.y = 1.4;
  tree.add(trunk);

  for (let i = 0; i < 3; i += 1) {
    const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15 - i * 0.22, 0), leafMat);
    canopy.position.set((i - 1) * 0.45, 2.7 + i * 0.45, (i % 2) * 0.3);
    tree.add(canopy);
  }
  tree.position.set(x, y, z);
  group.add(tree);
  return tree;
}

function addPalmTree(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  trunkMat: THREE.Material,
  leafMat: THREE.Material
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 4.4, 8), trunkMat);
  trunk.position.y = 2.2;
  tree.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.35, 7), leafMat);
  crown.position.y = 4.65;
  tree.add(crown);
  tree.position.set(x, y, z);
  group.add(tree);
  return tree;
}

function populateGrassLogsAndRocks(
  group: THREE.Group,
  cx: number,
  cz: number,
  maxRadius: number,
  count: number,
  lushMat: THREE.Material,
  stoneMat: THREE.Material,
  woodDarkMat: THREE.Material,
  swaying: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }>
): void {
  const bladeGeo = new THREE.ConeGeometry(0.14, 0.55, 5);
  const rockGeo = new THREE.DodecahedronGeometry(0.38, 0);
  const logGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.6, 7);

  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.39996;
    const r = 4.5 + ((i * 13) % Math.max(6, maxRadius - 6));
    const gx = cx + Math.cos(angle) * r;
    const gz = cz + Math.sin(angle) * r;

    const tuft = new THREE.Group();
    for (let b = 0; b < 3; b += 1) {
      const blade = new THREE.Mesh(bladeGeo, lushMat);
      blade.position.set((b - 1) * 0.14, 0.25, (b % 2) * 0.1);
      blade.rotation.z = (b - 1) * 0.18;
      tuft.add(blade);
    }
    tuft.position.set(gx, 0, gz);
    group.add(tuft);
    swaying.push({ obj: tuft, phase: i * 0.5, baseRotZ: 0 });

    if (i % 5 === 0) {
      const rock = new THREE.Mesh(rockGeo, stoneMat);
      rock.position.set(gx + 0.5, 0.14, gz - 0.4);
      rock.scale.set(1.2, 0.7, 1.0);
      group.add(rock);
    }
    if (i % 11 === 0) {
      const log = new THREE.Mesh(logGeo, woodDarkMat);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = angle;
      log.position.set(gx - 0.6, 0.16, gz + 0.5);
      group.add(log);
    }
  }
}
