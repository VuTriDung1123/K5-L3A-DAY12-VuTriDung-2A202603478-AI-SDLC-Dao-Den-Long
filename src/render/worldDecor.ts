import * as THREE from "three";
import { ISLAND_RADIUS } from "../core/config.js";

export interface DecorUpdateHandle {
  update(elapsedSec: number): void;
}

/**
 * Builds the atmospheric circular island ("Dao Ben"), wooden pier, cloud sea,
 * and drifting outer sky lanterns. Strictly decorative (zero gameplay impact).
 */
export function buildIslandDecor(
  scene: THREE.Scene,
  lanternPositions: ReadonlyArray<readonly [number, number, number]>
): DecorUpdateHandle {
  // Island main ground at Y = 0
  const groundGeo = new THREE.CylinderGeometry(ISLAND_RADIUS, ISLAND_RADIUS + 1.2, 1.4, 48);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1c263b,
    roughness: 0.92,
    metalness: 0.05,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -0.7;
  ground.receiveShadow = true;
  scene.add(ground);

  // Subtle stone rim around the island boundary
  const rimGeo = new THREE.RingGeometry(ISLAND_RADIUS - 0.5, ISLAND_RADIUS + 0.15, 64);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x323d57,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = 0.02;
  scene.add(rim);

  // Central shrine stone circle at (0, 0, 0)
  const shrineGeo = new THREE.CylinderGeometry(2.3, 2.6, 0.14, 24);
  const shrineMat = new THREE.MeshStandardMaterial({ color: 0x2c3650, roughness: 0.85 });
  const shrine = new THREE.Mesh(shrineGeo, shrineMat);
  shrine.position.y = 0.01;
  scene.add(shrine);

  // Subtle stone path spokes toward each lantern
  const pathMat = new THREE.MeshStandardMaterial({ color: 0x253049, roughness: 0.9 });
  for (const pos of lanternPositions) {
    const dist = Math.hypot(pos[0], pos[2]);
    const pathGeo = new THREE.BoxGeometry(1.1, 0.04, dist);
    const path = new THREE.Mesh(pathGeo, pathMat);
    path.position.set(pos[0] * 0.5, 0.015, pos[2] * 0.5);
    path.rotation.y = Math.atan2(pos[0], pos[2]);
    scene.add(path);
  }

  // Wooden pier ("Ben tau") extending outward at -Z
  const pierGroup = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3e2b, roughness: 0.9 });
  const plankGeo = new THREE.BoxGeometry(3.4, 0.16, 6.5);
  const pierDeck = new THREE.Mesh(plankGeo, woodMat);
  pierDeck.position.set(0, 0.06, -(ISLAND_RADIUS + 2.4));
  pierGroup.add(pierDeck);

  for (const side of [-1.45, 1.45]) {
    for (const zOff of [-1.5, -4.8]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 1.8, 8), woodMat);
      post.position.set(side, 0.3, -(ISLAND_RADIUS + Math.abs(zOff)));
      pierGroup.add(post);
    }
    const dockLamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xffd084,
        emissive: 0xff9a36,
        emissiveIntensity: 1.4,
      })
    );
    dockLamp.position.set(side, 1.25, -(ISLAND_RADIUS + 4.8));
    pierGroup.add(dockLamp);
  }
  scene.add(pierGroup);

  // Cloud sea below the island
  const seaGeo = new THREE.CircleGeometry(140, 48);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x0b1021,
    roughness: 0.95,
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -2.1;
  scene.add(sea);

  // Drifting outer sky lanterns & cloud puffs in the cloud sea
  const floatingLanterns: Array<{ mesh: THREE.Mesh; baseAngle: number; radius: number; speed: number; baseY: number }> = [];
  const floatGeo = new THREE.BoxGeometry(0.55, 0.75, 0.55);
  const floatMat = new THREE.MeshStandardMaterial({
    color: 0xffc670,
    emissive: 0xff8a24,
    emissiveIntensity: 1.1,
  });

  for (let i = 0; i < 14; i += 1) {
    const mesh = new THREE.Mesh(floatGeo, floatMat);
    const baseAngle = (i / 14) * Math.PI * 2;
    const radius = 38 + (i % 3) * 7;
    const baseY = 1.5 + (i % 4) * 1.4;
    scene.add(mesh);
    floatingLanterns.push({
      mesh,
      baseAngle,
      radius,
      speed: 0.03 + (i % 3) * 0.01,
      baseY,
    });
  }

  return {
    update(elapsedSec: number): void {
      for (const fl of floatingLanterns) {
        const angle = fl.baseAngle + elapsedSec * fl.speed;
        fl.mesh.position.set(
          Math.cos(angle) * fl.radius,
          fl.baseY + Math.sin(elapsedSec * 1.2 + fl.baseAngle) * 0.6,
          Math.sin(angle) * fl.radius
        );
        fl.mesh.rotation.y = -angle;
      }
    },
  };
}
