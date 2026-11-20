import * as THREE from "three";
import type { NightMapConfig } from "../core/maps.js";
import type { WindState } from "../core/types.js";

export interface WorldVisualHandle {
  group: THREE.Group;
  update(elapsedSec: number, wind: WindState): void;
  dispose(): void;
}

const COLORS = {
  grass: 0x2f5d50,
  grassLush: 0x3b7362,
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  sea: 0x12384a,
  gold: 0xf2c14e,
  amber: 0xffb347,
  stone: 0x4b5366,
  blossom: 0xffd59e,
};

/**
 * Builds the richly detailed 3D environment for Night 1 (Dao Ben), Night 2 (Dao Cau), or Night 3 (Dao Chuong):
 * includes swaying grass clumps, weeping lantern-willow trees, bamboo groves, stone pathways,
 * mossy rocks, starfield dome, cloud-sea waves, and wind-blown leaf particles.
 */
export function buildNightWorld(scene: THREE.Scene, map: NightMapConfig): WorldVisualHandle {
  const group = new THREE.Group();
  scene.add(group);

  const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.9 });
  const lushMat = new THREE.MeshStandardMaterial({ color: COLORS.grassLush, roughness: 0.82 });
  const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.88 });
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.86 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.88 });
  const padMat = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    emissive: COLORS.amber,
    emissiveIntensity: 1.1,
  });

  // Starfield sky dome
  const starPositions = new Float32Array(180 * 3);
  for (let i = 0; i < 180; i += 1) {
    const theta = (i * 2.39996) % (Math.PI * 2);
    const phi = 0.15 + ((i * 7) % 50) * 0.011;
    const r = 155;
    starPositions[i * 3] = (map.night === 2 ? 35 : 0) + r * Math.cos(theta) * Math.cos(phi);
    starPositions[i * 3 + 1] = 18 + r * Math.sin(phi);
    starPositions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starPoints = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xfff6c2, size: 1.1, transparent: true, opacity: 0.85 })
  );
  group.add(starPoints);

  // Cloud sea floor + animated mist rings
  const seaCenter = map.night === 2 ? 35 : 0;
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(230, 48),
    new THREE.MeshStandardMaterial({ color: COLORS.sea, roughness: 0.92 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(seaCenter, -10.5, 0);
  group.add(sea);

  const mistRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(46 + i * 16, 51 + i * 16, 48),
      new THREE.MeshBasicMaterial({
        color: 0x264b63,
        transparent: true,
        opacity: 0.22 - i * 0.05,
        side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(seaCenter, -2.5 - i * 1.2, 0);
    group.add(ring);
    mistRings.push(ring);
  }

  const swayingFoliage: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }> = [];

  if (map.night === 1) {
    addCircularIsland(group, 0, 0, 40, grassMat, sandMat, stoneMat);
    addStonePathsToLanterns(group, 0, 0, map.lanterns, stoneMat);
    // Detailed wooden pier with posts & welcome archway
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.28, 7), woodMat);
    pier.position.set(0, -0.05, -42.5);
    group.add(pier);
    addWoodenArch(group, 0, 0, -38.5, woodMat);

    // Scatter willow trees, bamboo, rocks, and swaying grass clumps
    for (let i = 0; i < 10; i += 1) {
      const a = (i / 10) * Math.PI * 2 + 0.25;
      const r = i % 2 === 0 ? 17 : 30;
      const tx = Math.cos(a) * r;
      const tz = Math.sin(a) * r;
      if (map.lanterns.some((l) => Math.hypot(l.pos[0] - tx, l.pos[2] - tz) < 4.5)) continue;
      const tree = addWillowTree(group, tx, 0, tz, woodMat, lushMat);
      swayingFoliage.push({ obj: tree, phase: i * 0.9, baseRotZ: 0 });
    }
    populateGrassAndRocks(group, 0, 0, 36, 44, lushMat, stoneMat, swayingFoliage);
  } else if (map.night === 2) {
    addCircularIsland(group, 0, 0, 28, grassMat, sandMat, stoneMat);
    addCircularIsland(group, 70, 0, 28, grassMat, sandMat, stoneMat);
    // Bamboo bridge x in [26, 44], z in [-2, 2] with bamboo pole posts
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.28, 4), woodMat);
    bridge.position.set(35, -0.14, 0);
    group.add(bridge);
    for (let bx = 27; bx <= 43; bx += 4) {
      for (const bz of [-1.85, 1.85]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.7, 6), woodMat);
        post.position.set(bx, 0.25, bz);
        group.add(post);
      }
    }

    for (const [cx, cz] of [
      [-16, 12],
      [13, 15],
      [-12, -16],
      [56, 15],
      [83, 12],
      [82, -14],
    ]) {
      const palm = addPalmTree(group, cx, 0, cz, woodMat, lushMat);
      swayingFoliage.push({ obj: palm, phase: cx * 0.2, baseRotZ: 0 });
    }
    populateGrassAndRocks(group, 0, 0, 24, 28, lushMat, stoneMat, swayingFoliage);
    populateGrassAndRocks(group, 70, 0, 24, 28, lushMat, stoneMat, swayingFoliage);
  } else {
    // Night 3: Tier 0 (r=45, Y=0)
    addCircularIsland(group, 0, 0, 45, grassMat, sandMat, stoneMat);

    // Tier 1: Elevated half-annulus deck r=12..24, z > 0, Y=3
    const tier1Geo = new THREE.RingGeometry(12, 24, 36, 1, 0, Math.PI);
    const tier1Cap = new THREE.Mesh(tier1Geo, grassMat);
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

    // Two straight radial ramps at 30 deg and 150 deg (r=30 Y=0 to r=24 Y=3, width 3m)
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
    }

    // Tier 2: Central plateau r=8, Y=6
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.45, 32), grassMat);
    tier2.position.y = 5.775;
    group.add(tier2);
    const tier2Rim = new THREE.Mesh(new THREE.RingGeometry(7.5, 8, 32), sandMat);
    tier2Rim.rotation.x = -Math.PI / 2;
    tier2Rim.position.y = 6.02;
    group.add(tier2Rim);

    // Central Bell Tower (radius 2m, height 8m on top of Tier 2)
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.0, 8, 16), woodMat);
    tower.position.set(0, 10, 0);
    group.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.0, 12), sandMat);
    roof.position.set(0, 14.9, 0);
    group.add(roof);
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.72, 0.95, 12),
      new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.65, roughness: 0.25 })
    );
    bell.position.set(0, 13.2, 0);
    group.add(bell);

    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const tx = Math.cos(a) * 38;
      const tz = Math.sin(a) * 38;
      const tree = addWillowTree(group, tx, 0, tz, woodMat, lushMat);
      swayingFoliage.push({ obj: tree, phase: i, baseRotZ: 0 });
    }
    populateGrassAndRocks(group, 0, 0, 41, 46, lushMat, stoneMat, swayingFoliage);
  }

  // Jump Pads with glowing concentric rings
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
  for (let i = 0; i < 18; i += 1) {
    const mesh = new THREE.Mesh(floatGeo, floatMat);
    const angle = (i / 18) * Math.PI * 2;
    const radius = 54 + (i % 4) * 7;
    const y = 1.5 + (i % 5) * 1.6;
    group.add(mesh);
    floaters.push({ mesh, angle, radius, y });
  }

  // Wind swirling leaf particles
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
    update(elapsedSec: number, wind: WindState): void {
      for (const pad of padRings) {
        pad.rotation.y = elapsedSec * 2.4;
      }
      mistRings.forEach((r, idx) => {
        const s = 1 + Math.sin(elapsedSec * 0.7 + idx) * 0.03;
        r.scale.set(s, s, 1);
      });
      for (const fl of floaters) {
        const a = fl.angle + elapsedSec * 0.035;
        fl.mesh.position.set(
          seaCenter + Math.cos(a) * fl.radius,
          fl.y + Math.sin(elapsedSec * 1.2 + fl.angle) * 0.55,
          Math.sin(a) * fl.radius
        );
      }

      // Gentle foliage breeze sway (amplified during wind)
      const swayAmp = wind.active ? 0.14 : wind.warning ? 0.08 : 0.035;
      const swayFreq = wind.active ? 5.5 : 2.1;
      for (const item of swayingFoliage) {
        item.obj.rotation.z = item.baseRotZ + Math.sin(elapsedSec * swayFreq + item.phase) * swayAmp;
      }

      const showWind = wind.active || wind.warning;
      const wRad = (wind.dirDeg * Math.PI) / 180;
      const speed = wind.active ? 0.42 : 0.16;
      for (let i = 0; i < leaves.length; i += 1) {
        const leaf = leaves[i];
        leaf.visible = showWind;
        if (!showWind) continue;
        leaf.position.x += Math.cos(wRad) * speed;
        leaf.position.z += Math.sin(wRad) * speed;
        leaf.rotation.y += 0.18;
        leaf.rotation.x += 0.1;
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
  const stepGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.07, 8);
  for (const l of lanterns) {
    const dx = l.pos[0] - cx;
    const dz = l.pos[2] - cz;
    const dist = Math.hypot(dx, dz);
    const steps = Math.floor(dist / 2.6);
    for (let s = 2; s < steps; s += 1) {
      const t = s / steps;
      const stone = new THREE.Mesh(stepGeo, stoneMat);
      stone.position.set(cx + dx * t, 0.02, cz + dz * t);
      group.add(stone);
    }
  }
}

function addWoodenArch(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  woodMat: THREE.Material
): void {
  const arch = new THREE.Group();
  for (const sx of [-1.5, 1.5]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 3.2, 8), woodMat);
    post.position.set(sx, 1.6, 0);
    arch.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, 0.3), woodMat);
  beam.position.set(0, 3.1, 0);
  arch.add(beam);
  arch.position.set(x, y, z);
  group.add(arch);
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

  const bud = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 6, 6),
    new THREE.MeshBasicMaterial({ color: COLORS.blossom })
  );
  bud.position.set(0.6, 2.1, 0.4);
  tree.add(bud);

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

function populateGrassAndRocks(
  group: THREE.Group,
  cx: number,
  cz: number,
  maxRadius: number,
  count: number,
  lushMat: THREE.Material,
  stoneMat: THREE.Material,
  swaying: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }>
): void {
  const bladeGeo = new THREE.ConeGeometry(0.14, 0.55, 5);
  const rockGeo = new THREE.DodecahedronGeometry(0.38, 0);
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
  }
}
