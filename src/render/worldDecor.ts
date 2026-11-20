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
  sand: 0xc9b48a,
  wood: 0x6b4a2f,
  sea: 0x12384a,
  gold: 0xf2c14e,
  amber: 0xffb347,
};

/**
 * Builds the 3D environment for Night 1 (Dao Ben), Night 2 (Dao Cau), or Night 3 (Dao Chuong)
 * matching exact map coordinates, bridges, ramps, jump pads, bell tower, and cloud sea.
 */
export function buildNightWorld(scene: THREE.Scene, map: NightMapConfig): WorldVisualHandle {
  const group = new THREE.Group();
  scene.add(group);

  const grassMat = new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.92 });
  const sandMat = new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.88 });
  const woodMat = new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.88 });
  const padMat = new THREE.MeshStandardMaterial({
    color: COLORS.gold,
    emissive: COLORS.amber,
    emissiveIntensity: 0.9,
  });

  // Cloud sea floor
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(220, 48),
    new THREE.MeshStandardMaterial({ color: COLORS.sea, roughness: 0.95 })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(map.night === 2 ? 35 : 0, -10.5, 0);
  group.add(sea);

  if (map.night === 1) {
    addCircularIsland(group, 0, 0, 40, grassMat, sandMat);
    // Decorative wooden pier outside edge
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.25, 6), woodMat);
    pier.position.set(0, -0.05, -42.5);
    group.add(pier);
  } else if (map.night === 2) {
    addCircularIsland(group, 0, 0, 28, grassMat, sandMat);
    addCircularIsland(group, 70, 0, 28, grassMat, sandMat);
    // Bamboo bridge x in [26, 44], z in [-2, 2]
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(18, 0.28, 4), woodMat);
    bridge.position.set(35, -0.14, 0);
    group.add(bridge);
    // Decorative areca palms
    for (const [px, pz] of [
      [-18, 12],
      [14, -18],
      [56, 15],
      [84, 10],
    ]) {
      addPalmTree(group, px, 0, pz, woodMat, grassMat);
    }
  } else {
    // Night 3: Tier 0 (r=45, Y=0)
    addCircularIsland(group, 0, 0, 45, grassMat, sandMat);

    // Tier 1: Elevated half-annulus deck r=12..24, z > 0, Y=3 (open underneath at Y=0)
    const tier1Geo = new THREE.RingGeometry(12, 24, 36, 1, 0, Math.PI);
    const tier1Cap = new THREE.Mesh(tier1Geo, grassMat);
    tier1Cap.rotation.x = -Math.PI / 2;
    tier1Cap.position.y = 3;
    group.add(tier1Cap);

    const tier1Lip = new THREE.Mesh(
      new THREE.CylinderGeometry(24, 24, 0.35, 36, 1, true, Math.PI / 2, Math.PI),
      sandMat
    );
    tier1Lip.position.y = 2.82;
    tier1Lip.rotation.y = -Math.PI / 2;
    group.add(tier1Lip);

    // Slender pillars supporting Tier 1 and Tier 2 decks
    for (const deg of [25, 65, 115, 155]) {
      const rad = (deg * Math.PI) / 180;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3, 8), woodMat);
      col.position.set(18 * Math.cos(rad), 1.5, 18 * Math.sin(rad));
      group.add(col);
    }
    for (const deg of [45, 135, 225, 315]) {
      const rad = (deg * Math.PI) / 180;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 6, 8), woodMat);
      col.position.set(6.5 * Math.cos(rad), 3.0, 6.5 * Math.sin(rad));
      group.add(col);
    }

    // Two straight radial ramps at 30 deg and 150 deg (r=30 Y=0 to r=24 Y=3, width 3m)
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const rampLen = Math.hypot(6, 3);
      const ramp = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.3, 3), woodMat);
      const midR = 27;
      ramp.position.set(midR * Math.cos(rad), 1.5 - 0.15, midR * Math.sin(rad));
      ramp.rotation.order = "YXZ";
      ramp.rotation.y = -rad;
      ramp.rotation.z = -Math.atan2(3, 6);
      group.add(ramp);
    }

    // Tier 2: Elevated central disc r=8, Y=6 (open underneath at Y=0)
    const tier2 = new THREE.Mesh(new THREE.CylinderGeometry(8, 8, 0.45, 32), grassMat);
    tier2.position.y = 5.775;
    group.add(tier2);
    const tier2Rim = new THREE.Mesh(new THREE.RingGeometry(7.5, 8, 32), sandMat);
    tier2Rim.rotation.x = -Math.PI / 2;
    tier2Rim.position.y = 6.02;
    group.add(tier2Rim);

    // Central Bell Tower (radius 2m, height 8m on top of Tier 2)
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.0, 8, 16), woodMat);
    tower.position.set(0, 10, 0);
    group.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8, 1.8, 12), sandMat);
    roof.position.set(0, 14.8, 0);
    group.add(roof);
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.7, 0.9, 12),
      new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.6, roughness: 0.3 })
    );
    bell.position.set(0, 13.2, 0);
    group.add(bell);
  }

  // Jump Pads
  const padRings: THREE.Mesh[] = [];
  for (const pad of map.jumpPads) {
    const padMesh = new THREE.Mesh(new THREE.CylinderGeometry(pad.radius, pad.radius * 1.1, 0.2, 20), padMat);
    padMesh.position.set(pad.pos[0], pad.pos[1] + 0.1, pad.pos[2]);
    group.add(padMesh);
    padRings.push(padMesh);
  }

  // Drifting sky lanterns outside islands
  const floaters: Array<{ mesh: THREE.Mesh; angle: number; radius: number; y: number }> = [];
  const floatGeo = new THREE.BoxGeometry(0.6, 0.8, 0.6);
  const floatMat = new THREE.MeshStandardMaterial({
    color: COLORS.amber,
    emissive: COLORS.amber,
    emissiveIntensity: 0.9,
  });
  for (let i = 0; i < 12; i += 1) {
    const mesh = new THREE.Mesh(floatGeo, floatMat);
    const angle = (i / 12) * Math.PI * 2;
    const radius = 56 + (i % 3) * 8;
    const y = 2 + (i % 4) * 1.6;
    group.add(mesh);
    floaters.push({ mesh, angle, radius, y });
  }

  // Wind swirling leaf particles (visible during Night 3 warning/active wind)
  const leaves: THREE.Mesh[] = [];
  const leafGeo = new THREE.BoxGeometry(0.35, 0.05, 0.2);
  const leafMat = new THREE.MeshBasicMaterial({ color: COLORS.gold });
  for (let i = 0; i < 24; i += 1) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.visible = false;
    leaf.position.set(((i * 17) % 60) - 30, 1 + (i % 5) * 1.3, ((i * 23) % 60) - 30);
    group.add(leaf);
    leaves.push(leaf);
  }

  return {
    group,
    update(elapsedSec: number, wind: WindState): void {
      for (const pad of padRings) {
        pad.rotation.y = elapsedSec * 2;
      }
      const centerOffset = map.night === 2 ? 35 : 0;
      for (const fl of floaters) {
        const a = fl.angle + elapsedSec * 0.04;
        fl.mesh.position.set(
          centerOffset + Math.cos(a) * fl.radius,
          fl.y + Math.sin(elapsedSec + fl.angle) * 0.5,
          Math.sin(a) * fl.radius
        );
      }

      const showWind = wind.active || wind.warning;
      const wRad = (wind.dirDeg * Math.PI) / 180;
      const speed = wind.active ? 0.35 : 0.14;
      for (let i = 0; i < leaves.length; i += 1) {
        const leaf = leaves[i];
        leaf.visible = showWind;
        if (!showWind) continue;
        leaf.position.x += Math.cos(wRad) * speed;
        leaf.position.z += Math.sin(wRad) * speed;
        leaf.rotation.y += 0.15;
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
  sandMat: THREE.Material
): void {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 1.2, 1.6, 48), grassMat);
  base.position.set(cx, -0.8, cz);
  group.add(base);

  const rim = new THREE.Mesh(new THREE.RingGeometry(radius - 1.3, radius, 48), sandMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(cx, 0.02, cz);
  group.add(rim);
}

function addPalmTree(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  trunkMat: THREE.Material,
  leafMat: THREE.Material
): void {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 4.5, 8), trunkMat);
  trunk.position.set(x, y + 2.25, z);
  group.add(trunk);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.4, 7), leafMat);
  crown.position.set(x, y + 4.8, z);
  group.add(crown);
}
