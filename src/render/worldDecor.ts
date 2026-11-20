import * as THREE from "three";
import type { NightMapConfig } from "../core/maps.js";
import type { WindState } from "../core/types.js";

export interface WorldVisualHandle {
  group: THREE.Group;
  update(
    elapsedSec: number,
    wind: WindState,
    reducedMotion?: boolean,
    dawnProgress?: number,
    litRatio?: number
  ): void;
  dispose(): void;
}

const COLORS = {
  grass: 0x336555,
  grassLush: 0x458068,
  grassHill: 0x2a5448,
  sand: 0xd4be94,
  plaster: 0xeae1cf,
  wood: 0x734e31,
  woodDark: 0x3d2617,
  roofTile: 0x262d3d,
  sea: 0x102d42,
  gold: 0xf2c14e,
  amber: 0xffb347,
  stone: 0x5c6478,
  cliffRock: 0x3a4052,
  snow: 0xeef3ff,
  toriiRed: 0xc8182e,
  sakuraPink: 0xffbad7,
  sakuraLight: 0xffd9ea,
  momijiRed: 0xd94836,
  momijiAmber: 0xeb8434,
  pineGreen: 0x214a3e,
  shojiWarm: 0xffe9b0,
  bamboo: 0x539464,
};

interface PaletteMaterials {
  grass: THREE.MeshStandardMaterial;
  lush: THREE.MeshStandardMaterial;
  hill: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  roofTile: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  cliff: THREE.MeshStandardMaterial;
  snow: THREE.MeshStandardMaterial;
  torii: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  sakura: THREE.MeshStandardMaterial;
  sakuraLight: THREE.MeshStandardMaterial;
  momijiRed: THREE.MeshStandardMaterial;
  momijiAmber: THREE.MeshStandardMaterial;
  pine: THREE.MeshStandardMaterial;
  bamboo: THREE.MeshStandardMaterial;
  shoji: THREE.MeshStandardMaterial;
  chochin: THREE.MeshStandardMaterial;
  pad: THREE.MeshStandardMaterial;
}

/**
 * Builds an expansive, atmospheric Ancient Japanese Archipelago 3D environment for Nights 1, 2, and 3:
 * - Sky dome shader with starry Milky Way (Amanogawa), Harvest Moon, rising Dawn Sun (Asahi),
 *   shooting stars (nagareboshi), and drifting ukiyo-e clouds
 * - Panoramic volcanic Mt. Fuji peak, forested coastal mountains, distant pagoda islets,
 *   and cliff terraces visually expanding each island while keeping exact Contract v1.3 playable ground
 * - Dense Japanese villages (machiya houses, multi-tier pagodas, glowing shoji, hanging chochin,
 *   Senbon Torii gates, stone Toro lanterns, lotus ponds) and lush forests (Sakura, Momiji, Pine, Bamboo)
 * - Exact Night 3 architecture: Kiyomizu-dera style wooden kakezukuri Tier 1 deck cleanly on z > 0,
 *   aligned stepped shrine ramps at 30 deg & 150 deg, and Imperial Shoro Bell Tower on Tier 2
 */
export function buildNightWorld(scene: THREE.Scene, map: NightMapConfig): WorldVisualHandle {
  const group = new THREE.Group();
  scene.add(group);

  const mats: PaletteMaterials = {
    grass: new THREE.MeshStandardMaterial({ color: COLORS.grass, roughness: 0.88 }),
    lush: new THREE.MeshStandardMaterial({ color: COLORS.grassLush, roughness: 0.82 }),
    hill: new THREE.MeshStandardMaterial({ color: COLORS.grassHill, roughness: 0.9 }),
    sand: new THREE.MeshStandardMaterial({ color: COLORS.sand, roughness: 0.85 }),
    plaster: new THREE.MeshStandardMaterial({ color: COLORS.plaster, roughness: 0.8 }),
    wood: new THREE.MeshStandardMaterial({ color: COLORS.wood, roughness: 0.82 }),
    woodDark: new THREE.MeshStandardMaterial({ color: COLORS.woodDark, roughness: 0.86 }),
    roofTile: new THREE.MeshStandardMaterial({ color: COLORS.roofTile, roughness: 0.72 }),
    stone: new THREE.MeshStandardMaterial({ color: COLORS.stone, roughness: 0.86 }),
    cliff: new THREE.MeshStandardMaterial({ color: COLORS.cliffRock, roughness: 0.92 }),
    snow: new THREE.MeshStandardMaterial({
      color: COLORS.snow,
      emissive: 0x3a4668,
      emissiveIntensity: 0.25,
      roughness: 0.7,
    }),
    torii: new THREE.MeshStandardMaterial({
      color: COLORS.toriiRed,
      emissive: 0x3b0710,
      emissiveIntensity: 0.22,
      roughness: 0.52,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      emissive: 0x6b4a10,
      emissiveIntensity: 0.45,
      metalness: 0.55,
      roughness: 0.3,
    }),
    sakura: new THREE.MeshStandardMaterial({
      color: COLORS.sakuraPink,
      emissive: 0x662442,
      emissiveIntensity: 0.32,
      roughness: 0.75,
    }),
    sakuraLight: new THREE.MeshStandardMaterial({
      color: COLORS.sakuraLight,
      emissive: 0x54233b,
      emissiveIntensity: 0.28,
      roughness: 0.75,
    }),
    momijiRed: new THREE.MeshStandardMaterial({
      color: COLORS.momijiRed,
      emissive: 0x4d140e,
      emissiveIntensity: 0.3,
      roughness: 0.78,
    }),
    momijiAmber: new THREE.MeshStandardMaterial({
      color: COLORS.momijiAmber,
      emissive: 0x592c0a,
      emissiveIntensity: 0.28,
      roughness: 0.78,
    }),
    pine: new THREE.MeshStandardMaterial({ color: COLORS.pineGreen, roughness: 0.86 }),
    bamboo: new THREE.MeshStandardMaterial({ color: COLORS.bamboo, roughness: 0.72 }),
    shoji: new THREE.MeshStandardMaterial({
      color: COLORS.shojiWarm,
      emissive: COLORS.amber,
      emissiveIntensity: 1.25,
      roughness: 0.4,
    }),
    chochin: new THREE.MeshStandardMaterial({
      color: 0xff6b4a,
      emissive: 0xff7b36,
      emissiveIntensity: 1.35,
      roughness: 0.4,
    }),
    pad: new THREE.MeshStandardMaterial({
      color: COLORS.gold,
      emissive: COLORS.amber,
      emissiveIntensity: 1.25,
    }),
  };

  const seaCenter = map.night === 2 ? 35 : 0;

  // =========================================================================
  // 1. ANCIENT JAPANESE CELESTIAL SKY DOME (Stars, Milky Way, Moon, Dawn Sun)
  // =========================================================================
  const skyUniforms = {
    uDawn: { value: 0.2 },
    uSunDir: { value: new THREE.Vector3(0.36, 0.14, 0.92).normalize() },
  };
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: skyUniforms,
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uDawn;
      uniform vec3 uSunDir;
      varying vec3 vWorldDir;
      void main() {
        vec3 d = normalize(vWorldDir);
        float h = clamp(d.y * 0.5 + 0.5, 0.0, 1.0);
        float horizonFactor = pow(1.0 - clamp(d.y, 0.0, 1.0), 3.0);

        vec3 zenithNight = vec3(0.025, 0.045, 0.155);
        vec3 midNight = vec3(0.08, 0.125, 0.30);
        vec3 horizonNight = vec3(0.22, 0.15, 0.34);
        vec3 horizonDawn = vec3(0.95, 0.52, 0.32);

        vec3 skyCol = mix(midNight, zenithNight, smoothstep(0.48, 0.90, h));
        skyCol = mix(skyCol, mix(horizonNight, horizonDawn, 0.30 + uDawn * 0.65), horizonFactor * 0.88);

        // Glowing golden-crimson sun halo on the +Z horizon behind Mt. Fuji
        float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
        float sunGlow = pow(sunDot, 6.0) * (0.45 + uDawn * 0.65);
        float sunCore = pow(sunDot, 48.0) * (0.55 + uDawn * 0.75);
        skyCol += vec3(1.0, 0.58, 0.28) * sunGlow + vec3(1.0, 0.94, 0.76) * sunCore;

        // Subtle sweeping Milky Way (Amanogawa) nebula ribbon arching across the sky
        float mwBand = exp(-pow((d.x * 0.58 - d.z * 0.35 - d.y * 0.42) * 3.6, 2.0));
        float mwVis = smoothstep(0.04, 0.38, d.y) * (1.0 - uDawn * 0.4);
        skyCol += vec3(0.28, 0.34, 0.68) * mwBand * mwVis * 0.38;

        gl_FragColor = vec4(skyCol, 1.0);
      }
    `,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(540, 32, 24), skyMat);
  skyDome.position.set(seaCenter, 0, 0);
  group.add(skyDome);

  // 1,350 Multi-hued twinkling stars + dense Amanogawa Milky Way stars (lower down to horizon too!)
  const starCount = 1350;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);
  const paletteStars = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xfff1c4),
    new THREE.Color(0xc4dcff),
    new THREE.Color(0xffd2e6),
    new THREE.Color(0xffd78c),
  ];
  for (let i = 0; i < starCount; i += 1) {
    let x: number;
    let y: number;
    let z: number;
    if (i < 950) {
      const theta = (i * 2.3999632) % (Math.PI * 2);
      const u = 0.03 + (((i * 37) % 940) / 940) * 0.94;
      const phi = Math.asin(u);
      const r = 440 + (i % 5) * 8;
      x = r * Math.cos(theta) * Math.cos(phi);
      y = r * Math.sin(phi);
      z = r * Math.sin(theta) * Math.cos(phi);
    } else {
      // Amanogawa Milky Way cluster band sweeping across +Z sky
      const t = ((i - 950) / 400) * Math.PI - Math.PI * 0.5;
      const spread = (((i * 53) % 100) / 100 - 0.5) * 0.28;
      const dir = new THREE.Vector3(
        Math.sin(t) * 0.72 + spread,
        Math.max(0.05, Math.cos(t) * 0.65 + spread * 0.3),
        Math.cos(t * 0.7) * 0.75 + spread * 0.5
      ).normalize();
      const r = 435;
      x = dir.x * r;
      y = dir.y * r;
      z = dir.z * r;
    }
    starPos[i * 3] = seaCenter + x;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = z;
    const c = paletteStars[i % paletteStars.length];
    starCol[i * 3] = c.r;
    starCol[i * 3 + 1] = c.g;
    starCol[i * 3 + 2] = c.b;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: 2.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.94,
    fog: false,
    sizeAttenuation: true,
  });
  const starField = new THREE.Points(starGeo, starMat);
  group.add(starField);

  // Luminous Harvest Moon (Tsuki) visible in the front-left starry sky (+Z, -X)
  const moonGroup = new THREE.Group();
  const moonDisk = new THREE.Mesh(
    new THREE.SphereGeometry(18, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6d6, fog: false })
  );
  moonGroup.add(moonDisk);
  const moonHaloInner = new THREE.Mesh(
    new THREE.SphereGeometry(28, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xffdf9e,
      transparent: true,
      opacity: 0.25,
      fog: false,
      depthWrite: false,
    })
  );
  moonGroup.add(moonHaloInner);
  const moonHaloOuter = new THREE.Mesh(
    new THREE.SphereGeometry(44, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xb8cbff,
      transparent: true,
      opacity: 0.11,
      fog: false,
      depthWrite: false,
    })
  );
  moonGroup.add(moonHaloOuter);
  moonGroup.position.set(seaCenter - 145, 92, 285);
  group.add(moonGroup);

  // Rising Golden-Vermilion Dawn Sun (Asahi) visible on the front-right horizon behind sacred Mt. Fuji (+Z, +X)
  const sunGroup = new THREE.Group();
  const sunDisk = new THREE.Mesh(
    new THREE.SphereGeometry(24, 24, 24),
    new THREE.MeshBasicMaterial({ color: 0xffc070, fog: false })
  );
  sunGroup.add(sunDisk);
  const sunAura = new THREE.Mesh(
    new THREE.SphereGeometry(44, 20, 20),
    new THREE.MeshBasicMaterial({
      color: 0xff6e40,
      transparent: true,
      opacity: 0.3,
      fog: false,
      depthWrite: false,
    })
  );
  sunGroup.add(sunAura);
  sunGroup.position.set(seaCenter + 135, 44, 330);
  group.add(sunGroup);

  // Graceful shooting stars (Nagareboshi)
  const shootingStars: Array<{
    mesh: THREE.Mesh;
    startX: number;
    startY: number;
    startZ: number;
    dx: number;
    dy: number;
    dz: number;
    period: number;
    offset: number;
  }> = [];
  const shootGeo = new THREE.CylinderGeometry(0.18, 0.02, 16, 6);
  shootGeo.rotateZ(Math.PI / 2);
  const shootMat = new THREE.MeshBasicMaterial({
    color: 0xfff8d6,
    transparent: true,
    opacity: 0.9,
    fog: false,
  });
  for (let i = 0; i < 4; i += 1) {
    const m = new THREE.Mesh(shootGeo, shootMat);
    m.visible = false;
    group.add(m);
    const angle = (i / 4) * Math.PI * 2 + 0.6;
    shootingStars.push({
      mesh: m,
      startX: seaCenter + Math.cos(angle) * 240,
      startY: 140 + i * 24,
      startZ: Math.sin(angle) * 240,
      dx: -Math.sin(angle) * 140,
      dy: -48,
      dz: Math.cos(angle) * 140,
      period: 9 + i * 3.5,
      offset: i * 2.4,
    });
  }

  // Stylized drifting ukiyo-e cloud ribbons in the sky
  const skyClouds: Array<{ obj: THREE.Group; baseAngle: number; r: number; y: number; speed: number }> = [];
  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0x6273a8,
    transparent: true,
    opacity: 0.24,
    fog: false,
    depthWrite: false,
  });
  for (let i = 0; i < 14; i += 1) {
    const cGroup = new THREE.Group();
    for (let k = 0; k < 3; k += 1) {
      const puff = new THREE.Mesh(new THREE.BoxGeometry(24 - k * 5, 2.2, 7.5), cloudMat);
      puff.position.set((k - 1) * 10, (k % 2) * 1.4, (k - 1) * 2.5);
      cGroup.add(puff);
    }
    const baseAngle = (i / 14) * Math.PI * 2;
    const r = 175 + (i % 3) * 45;
    const y = 48 + (i % 4) * 18;
    cGroup.position.set(seaCenter + Math.cos(baseAngle) * r, y, Math.sin(baseAngle) * r);
    cGroup.lookAt(seaCenter, y, 0);
    group.add(cGroup);
    skyClouds.push({ obj: cGroup, baseAngle, r, y, speed: 0.008 + (i % 3) * 0.003 });
  }

  // =========================================================================
  // 2. GRAND SEA OF CLOUDS & PANORAMIC JAPANESE MOUNTAIN ARCHIPELAGO
  // =========================================================================
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(560, 64),
    new THREE.MeshStandardMaterial({
      color: COLORS.sea,
      emissive: 0x081a2c,
      emissiveIntensity: 0.35,
      roughness: 0.85,
    })
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(seaCenter, -10.5, 0);
  group.add(sea);

  const mistRings: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(52 + i * 24, 62 + i * 24, 64),
      new THREE.MeshBasicMaterial({
        color: 0x3b6384,
        transparent: true,
        opacity: 0.22 - i * 0.035,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(seaCenter, -4.2 - i * 1.3, 0);
    group.add(ring);
    mistRings.push(ring);
  }

  // Build towering Mt. Fuji + encircling ancient Japanese mountains + distant temple pagoda islands
  addSurroundingMountainArchipelago(group, seaCenter, map.night, mats);

  const swayingFoliage: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }> = [];
  const waterRipples: THREE.Mesh[] = [];

  // =========================================================================
  // 3. PLAYABLE ISLANDS (EXACT CONTRACT GEOMETRY) + EXPANSIVE CLIFFS, VILLAGES & FORESTS
  // =========================================================================
  if (map.night === 1) {
    // Night 1 — Đảo Bến (playable r = 40 m + terraced rocky cliffs, harbor village & sakura woods)
    addGrandCircularIsland(group, 0, 0, 40, mats, true);
    addStonePathsToLanterns(group, 0, 0, map.lanterns, mats.stone);

    // Harbor wooden dock + triple Senbon Torii entrance + dockside lantern posts
    const pier = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.35, 11.5), mats.wood);
    pier.position.set(0, -0.05, -44.8);
    group.add(pier);
    for (const px of [-1.9, 1.9]) {
      for (let pz = -41; pz >= -49; pz -= 4) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 3.4, 8), mats.woodDark);
        post.position.set(px, -1.2, pz);
        group.add(post);
      }
    }
    addToriiGate(group, 0, 0, -37.8, 0, mats.torii, mats.woodDark, mats.gold);
    addToriiGate(group, 0, 0, -34.2, 0, mats.torii, mats.woodDark, mats.gold, 0.88);
    addStoneToro(group, -4.8, 0, -36.0, mats.stone, mats.shoji);
    addStoneToro(group, 4.8, 0, -36.0, mats.stone, mats.shoji);
    addStoneToro(group, -4.8, 0, -31.5, mats.stone, mats.shoji);
    addStoneToro(group, 4.8, 0, -31.5, mats.stone, mats.shoji);

    // Ancient Japanese village houses, teahouses & 3-story mini pagoda along scenic outer rim
    const n1Buildings: Array<[number, number, number, "house" | "teahouse" | "pagoda"]> = [
      [-28, -22, 0.65, "house"],
      [27, -23, -0.7, "teahouse"],
      [-32, -5, 1.45, "house"],
      [33, -6, -1.5, "house"],
      [-26, 22, 2.35, "teahouse"],
      [26, 22, -2.35, "pagoda"],
      [-12, -33, 0.35, "house"],
      [13, -33, -0.35, "house"],
      [0, -28, 0, "house"],
      [-14, 33, 2.75, "house"],
      [14, 33, -2.75, "house"],
    ];
    const n1Exclusions: Array<[number, number, number]> = [
      [19.5, -6.5, 5.2],
      [-19.5, -6.5, 4.8],
      [0, -35, 5.5],
    ];
    for (const [bx, bz, rot, kind] of n1Buildings) {
      if (!isClearOfGameplay(bx, bz, map, 4.6)) continue;
      if (kind === "pagoda") addJapanesePagoda(group, bx, 0, bz, 3, 0.62, mats);
      else if (kind === "teahouse") addJapaneseHouse(group, bx, 0, bz, rot, 1.15, true, mats);
      else addJapaneseHouse(group, bx, 0, bz, rot, 0.92, false, mats);
      n1Exclusions.push([bx, bz, 5.2]);
    }

    // Scenic rocky hillocks & pine crags near the rim
    for (const [hx, hz, hs] of [
      [-35, 11, 1.15],
      [35, 12, 1.1],
      [-21, -31, 0.95],
      [21, 31, 1.0],
    ]) {
      if (isClearOfGameplay(hx, hz, map, 4.2)) {
        addIslandHillCrag(group, hx, 0, hz, hs, mats, swayingFoliage);
        n1Exclusions.push([hx, hz, 4.5]);
      }
    }

    // Twin tranquil lotus ponds with arched footbridge
    waterRipples.push(addPond(group, 19.5, 0.03, -6.5, 3.8, mats));
    waterRipples.push(addPond(group, -19.5, 0.03, -6.5, 3.4, mats));

    // Dense Ancient Japanese forest (Sakura, Momiji, Pine, Bamboo) — 54 candidate trees clear of gameplay & houses
    populateJapaneseForest(group, 0, 0, 11, 37.5, 54, map, mats, swayingFoliage, n1Exclusions);
    populateStoneToros(group, 0, 0, 20, 10, map, mats);
    populateGrassLogsAndRocks(group, 0, 0, 37, 75, map, mats, swayingFoliage);
  } else if (map.night === 2) {
    // Night 2 — Đảo Cau (Twin Islands A r=28 at (0,0), B r=28 at (70,0), grand bamboo-lacquer bridge)
    addGrandCircularIsland(group, 0, 0, 28, mats, true);
    addGrandCircularIsland(group, 70, 0, 28, mats, true);
    addStonePathsToLanterns(group, 0, 0, map.lanterns.slice(0, 3), mats.stone);
    addStonePathsToLanterns(group, 70, 0, map.lanterns.slice(3, 6), mats.stone);

    // Ornate traditional Japanese bridge connecting Island A and B (x=26..44, z=-2..2)
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(18.4, 0.34, 4.0), mats.wood);
    bridgeDeck.position.set(35, -0.17, 0);
    group.add(bridgeDeck);
    // Red lacquer side rails + hanging lantern posts + under-bridge timber piers
    for (const bz of [-1.92, 1.92]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.14, 0.16), mats.torii);
      rail.position.set(35, 0.72, bz);
      group.add(rail);
      const midRail = new THREE.Mesh(new THREE.BoxGeometry(18.2, 0.09, 0.12), mats.woodDark);
      midRail.position.set(35, 0.38, bz);
      group.add(midRail);
    }
    for (let bx = 27; bx <= 43; bx += 4) {
      for (const bz of [-1.92, 1.92]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.92, 8), mats.torii);
        post.position.set(bx, 0.42, bz);
        group.add(post);
        const giboshi = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.gold);
        giboshi.position.set(bx, 0.92, bz);
        group.add(giboshi);
      }
      if (bx === 31 || bx === 39) {
        const pierCol = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.48, 10, 8), mats.woodDark);
        pierCol.position.set(bx, -5.2, 0);
        group.add(pierCol);
      }
    }
    addToriiGate(group, 25.8, 0, 0, Math.PI / 2, mats.torii, mats.woodDark, mats.gold);
    addToriiGate(group, 44.2, 0, 0, Math.PI / 2, mats.torii, mats.woodDark, mats.gold);

    // Twin shrine villages on Island A and Island B
    const n2Buildings: Array<[number, number, number, "house" | "teahouse" | "pagoda"]> = [
      [-19, 14, 0.75, "teahouse"],
      [-21, -2, 1.5, "house"],
      [-14, -20, 0.4, "house"],
      [11, -21, -0.5, "house"],
      [12, 20, -2.5, "house"],
      [58, 20, 2.5, "house"],
      [88, 13, -0.75, "pagoda"],
      [91, -2, -1.5, "house"],
      [84, -19, -0.45, "teahouse"],
      [59, -20, 0.5, "house"],
    ];
    const n2Exclusions: Array<[number, number, number]> = [
      [-11, 9, 4.2],
      [81, 9, 4.2],
    ];
    for (const [bx, bz, rot, kind] of n2Buildings) {
      if (!isClearOfGameplay(bx, bz, map, 4.3)) continue;
      if (kind === "pagoda") addJapanesePagoda(group, bx, 0, bz, 3, 0.58, mats);
      else if (kind === "teahouse") addJapaneseHouse(group, bx, 0, bz, rot, 1.05, true, mats);
      else addJapaneseHouse(group, bx, 0, bz, rot, 0.88, false, mats);
      n2Exclusions.push([bx, bz, 4.9]);
    }

    for (const [hx, hz, hs] of [
      [-23, -10, 0.95],
      [93, 9, 0.95],
      [53, 14, 0.85],
    ]) {
      if (isClearOfGameplay(hx, hz, map, 4.0)) {
        addIslandHillCrag(group, hx, 0, hz, hs, mats, swayingFoliage);
        n2Exclusions.push([hx, hz, 4.2]);
      }
    }

    waterRipples.push(addPond(group, -11, 0.03, 9, 2.9, mats));
    waterRipples.push(addPond(group, 81, 0.03, 9, 2.9, mats));

    populateJapaneseForest(group, 0, 0, 9, 25.5, 30, map, mats, swayingFoliage, n2Exclusions);
    populateJapaneseForest(group, 70, 0, 9, 25.5, 30, map, mats, swayingFoliage, n2Exclusions);
    populateStoneToros(group, 0, 0, 14, 6, map, mats);
    populateStoneToros(group, 70, 0, 14, 6, map, mats);
    populateGrassLogsAndRocks(group, 0, 0, 25, 42, map, mats, swayingFoliage);
    populateGrassLogsAndRocks(group, 70, 0, 25, 42, map, mats, swayingFoliage);
  } else {
    // =========================================================================
    // Night 3 — Đảo Chuông (FIXED 3-Tier Imperial Mountain Shrine!)
    // Exact contract geometry:
    //   Tier 0: r = 45, Y = 0
    //   Tier 1: r = 12..24, z > 0, Y = 3 (FIXED onto +Z using solid ExtrudeGeometry!)
    //   Ramps:  30 deg & 150 deg connecting r = 30 (Y=0) -> r = 24 (Y=3), width 3m
    //   Tier 2: r = 8, Y = 6 + Bell Tower r = 2 at (0, 6, 0)
    // =========================================================================
    addGrandCircularIsland(group, 0, 0, 45, mats, true);

    // --- TIER 1: Solid 3D Extruded Half-Annulus Deck on EXACT z > 0 (Y = 2.55..3.00) ---
    // With mesh.rotation.x = -PI/2, local (sx, sy, sz) -> world (sx, sz, -sy).
    // Setting sx = r*cos(a), sy = -r*sin(a) for a in [0, PI] places world Z = +r*sin(a) >= 0!
    const tier1Shape = new THREE.Shape();
    const segs = 48;
    for (let i = 0; i <= segs; i += 1) {
      const a = (i / segs) * Math.PI;
      const sx = Math.cos(a) * 24;
      const sy = -Math.sin(a) * 24;
      if (i === 0) tier1Shape.moveTo(sx, sy);
      else tier1Shape.lineTo(sx, sy);
    }
    for (let i = segs; i >= 0; i -= 1) {
      const a = (i / segs) * Math.PI;
      const sx = Math.cos(a) * 12;
      const sy = -Math.sin(a) * 12;
      tier1Shape.lineTo(sx, sy);
    }
    tier1Shape.closePath();

    const tier1Geo = new THREE.ExtrudeGeometry(tier1Shape, {
      depth: 0.45,
      bevelEnabled: false,
      curveSegments: 24,
    });
    const tier1Mesh = new THREE.Mesh(tier1Geo, [mats.grass, mats.wood]);
    tier1Mesh.rotation.x = -Math.PI / 2;
    tier1Mesh.position.y = 2.55; // bottom at Y=2.55, top walkable surface at EXACT Y=3.00!
    group.add(tier1Mesh);

    // Warm stone/sand walkable edge trim on top of Tier 1 (Y = 3.015)
    for (const trimR of [12.35, 23.65]) {
      const trimCurve = new THREE.Shape();
      for (let i = 0; i <= segs; i += 1) {
        const a = (i / segs) * Math.PI;
        const sx = Math.cos(a) * (trimR + 0.35);
        const sy = -Math.sin(a) * (trimR + 0.35);
        if (i === 0) trimCurve.moveTo(sx, sy);
        else trimCurve.lineTo(sx, sy);
      }
      for (let i = segs; i >= 0; i -= 1) {
        const a = (i / segs) * Math.PI;
        const sx = Math.cos(a) * (trimR - 0.35);
        const sy = -Math.sin(a) * (trimR - 0.35);
        trimCurve.lineTo(sx, sy);
      }
      trimCurve.closePath();
      const trimMesh = new THREE.Mesh(new THREE.ShapeGeometry(trimCurve), mats.sand);
      trimMesh.rotation.x = -Math.PI / 2;
      trimMesh.position.y = 3.02;
      group.add(trimMesh);
    }

    // Kiyomizu-dera style wooden Kakezukuri timber trestle pillars + cross-beams + under-lanterns
    const tier1Angles = [8, 22, 38, 56, 74, 90, 106, 124, 142, 158, 172];
    for (let idx = 0; idx < tier1Angles.length; idx += 1) {
      const deg = tier1Angles[idx];
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);

      // Pair of sturdy dark-timber columns (inner r=13, outer r=23) with stone footings
      for (const rCol of [13.0, 23.0]) {
        const cx = cos * rCol;
        const cz = sin * rCol;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 2.6, 8), mats.woodDark);
        col.position.set(cx, 1.3, cz);
        group.add(col);
        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.32, 8), mats.stone);
        foot.position.set(cx, 0.16, cz);
        group.add(foot);
      }

      // Radial timber tie-beam connecting inner & outer columns underneath Tier 1
      const radialBeam = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.26, 0.28), mats.wood);
      radialBeam.position.set(cos * 18, 2.38, sin * 18);
      radialBeam.rotation.y = -rad;
      group.add(radialBeam);

      // Glowing red Chochin paper lantern hanging under alternating bays
      if (idx % 2 === 1) {
        addHangingChochin(group, cos * 18, 2.05, sin * 18, mats.chochin, mats.woodDark);
      }

      // Vermilion shrine railing posts along Tier 1 outer & inner rims (leaving gaps at 30 deg, 150 deg ramps & 90 deg jump pad)
      if (Math.abs(deg - 30) > 8 && Math.abs(deg - 150) > 8) {
        const postOut = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.85, 6), mats.torii);
        postOut.position.set(cos * 23.75, 3.42, sin * 23.75);
        group.add(postOut);
        const capOut = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mats.gold);
        capOut.position.set(cos * 23.75, 3.88, sin * 23.75);
        group.add(capOut);
      }
      if (Math.abs(deg - 90) > 12) {
        const postIn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.85, 6), mats.torii);
        postIn.position.set(cos * 12.25, 3.42, sin * 12.25);
        group.add(postIn);
      }
    }

    // --- TWO ALIGNED SHRINE STAIR-RAMPS AT 30° & 150° (r=30 Y=0 -> r=24 Y=3, width 3m) ---
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const rampGroup = new THREE.Group();
      const rampLen = Math.hypot(6.2, 3.05);
      const slopeAngle = Math.atan2(3, 6);

      // Solid timber-and-stone ramp deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.36, 3.0), mats.wood);
      rampGroup.add(deck);

      // Carved stone steps along the inclined ramp surface
      const stepCount = 9;
      for (let s = 0; s < stepCount; s += 1) {
        const frac = (s + 0.5) / stepCount - 0.5;
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 2.75), mats.sand);
        step.position.set(frac * (rampLen - 0.5), 0.18, 0);
        rampGroup.add(step);
      }

      // Vermilion handrails with golden finials on both sides of the ramp
      for (const sideZ of [-1.42, 1.42]) {
        const handrail = new THREE.Mesh(new THREE.BoxGeometry(rampLen, 0.13, 0.13), mats.torii);
        handrail.position.set(0, 0.85, sideZ);
        rampGroup.add(handrail);
        for (const px of [-rampLen * 0.44, 0, rampLen * 0.44]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 6), mats.torii);
          post.position.set(px, 0.45, sideZ);
          rampGroup.add(post);
          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), mats.gold);
          finial.position.set(px, 0.92, sideZ);
          rampGroup.add(finial);
        }
      }

      rampGroup.position.set(27 * cos, 1.38, 27 * sin);
      rampGroup.rotation.order = "YXZ";
      rampGroup.rotation.y = -rad;
      rampGroup.rotation.z = -slopeAngle; // local +X slopes DOWN outward to r=30 (Y=0), local -X rises UP inward to r=24 (Y=3)
      group.add(rampGroup);

      // Grounded stone support abutment beneath the upper half of each ramp
      const abutment = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 2.8), mats.stone);
      abutment.position.set(25.2 * cos, 1.05, 25.2 * sin);
      abutment.rotation.y = -rad;
      group.add(abutment);

      // Pair of vermilion Senbon Torii arches framing the entrance to each shrine ramp
      addToriiGate(group, 31.2 * cos, 0, 31.2 * sin, Math.PI / 2 - rad, mats.torii, mats.woodDark, mats.gold);
      addToriiGate(group, 34.4 * cos, 0, 34.4 * sin, Math.PI / 2 - rad, mats.torii, mats.woodDark, mats.gold, 0.9);
      addStoneToro(group, 32.5 * cos - sin * 2.9, 0, 32.5 * sin + cos * 2.9, mats.stone, mats.shoji);
      addStoneToro(group, 32.5 * cos + sin * 2.9, 0, 32.5 * sin - cos * 2.9, mats.stone, mats.shoji);
    }

    // --- TIER 2: Sacred Imperial Sanctuary Deck (r = 8, Y = 6) ---
    const tier2Slab = new THREE.Mesh(new THREE.CylinderGeometry(8.0, 8.2, 0.55, 32), mats.grass);
    tier2Slab.position.y = 5.725;
    group.add(tier2Slab);
    const tier2WoodTrim = new THREE.Mesh(new THREE.CylinderGeometry(8.25, 8.25, 0.34, 32, 1, true), mats.woodDark);
    tier2WoodTrim.position.y = 5.68;
    group.add(tier2WoodTrim);
    const tier2Rim = new THREE.Mesh(new THREE.RingGeometry(7.35, 8.0, 32), mats.sand);
    tier2Rim.rotation.x = -Math.PI / 2;
    tier2Rim.position.y = 6.02;
    group.add(tier2Rim);

    // 8 grand vermilion temple pillars + crossbeams + hanging lanterns supporting Tier 2 (keeping (0,0,0) completely open!)
    for (let i = 0; i < 8; i += 1) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const px = Math.cos(a) * 6.8;
      const pz = Math.sin(a) * 6.8;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 5.55, 10), mats.torii);
      col.position.set(px, 2.775, pz);
      group.add(col);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.64, 0.45, 10), mats.stone);
      base.position.set(px, 0.225, pz);
      group.add(base);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.26, 10), mats.gold);
      collar.position.set(px, 5.3, pz);
      group.add(collar);
      if (i % 2 === 0) {
        addHangingChochin(group, Math.cos(a) * 5.6, 4.95, Math.sin(a) * 5.6, mats.chochin, mats.woodDark);
      }
      // Tier 2 ornate balcony posts (leaving landing opening facing jump pad at +Z)
      if (Math.sin(a) < 0.72) {
        const bPost = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.85, 6), mats.torii);
        bPost.position.set(Math.cos(a) * 7.8, 6.42, Math.sin(a) * 7.8);
        group.add(bPost);
        const bCap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 6), mats.gold);
        bCap.position.set(Math.cos(a) * 7.8, 6.88, Math.sin(a) * 7.8);
        group.add(bCap);
      }
    }

    // --- IMPERIAL JAPANESE BELL TOWER (SHORO) ON TIER 2 (r = 2, Y = 6..17.5) ---
    addImperialBellTower(group, 0, 6.0, 0, mats);

    // Ornate village surrounding Tier 0 perimeter (12 traditional buildings + grand 4-story pagoda!)
    const n3Buildings: Array<[number, number, number, "house" | "teahouse" | "pagoda"]> = [
      [-33, -24, 0.7, "teahouse"],
      [33, -24, -0.7, "teahouse"],
      [-39, -6, 1.45, "house"],
      [39, -6, -1.45, "house"],
      [-23, -34, 0.45, "house"],
      [23, -34, -0.45, "house"],
      [0, -37, 0, "pagoda"],
      [-36, 17, 2.1, "house"],
      [36, 17, -2.1, "house"],
      [-16, 36, 2.75, "house"],
      [16, 36, -2.75, "house"],
      [0, 38, Math.PI, "teahouse"],
    ];
    const n3Exclusions: Array<[number, number, number]> = [
      [-16, -22, 5.2],
      [16, -22, 5.2],
      [0, 18, 12.5], // keep under-deck / ramp corridor uncluttered
    ];
    for (const [bx, bz, rot, kind] of n3Buildings) {
      if (!isClearOfGameplay(bx, bz, map, 4.5)) continue;
      if (kind === "pagoda") addJapanesePagoda(group, bx, 0, bz, 4, 0.65, mats);
      else if (kind === "teahouse") addJapaneseHouse(group, bx, 0, bz, rot, 1.1, true, mats);
      else addJapaneseHouse(group, bx, 0, bz, rot, 0.9, false, mats);
      n3Exclusions.push([bx, bz, 5.2]);
    }

    // Scenic island mountain outcrops along the Tier 0 rim
    for (const [hx, hz, hs] of [
      [-39, 6, 1.2],
      [39, 6, 1.2],
      [-29, 29, 1.05],
      [29, 29, 1.05],
      [-11, -39, 1.0],
      [11, -39, 1.0],
    ]) {
      if (isClearOfGameplay(hx, hz, map, 4.2)) {
        addIslandHillCrag(group, hx, 0, hz, hs, mats, swayingFoliage);
        n3Exclusions.push([hx, hz, 4.5]);
      }
    }

    // Tranquil southern courtyard ponds
    waterRipples.push(addPond(group, -16, 0.03, -22, 3.8, mats));
    waterRipples.push(addPond(group, 16, 0.03, -22, 3.8, mats));

    // Dense sacred forest around Tier 0 (66 candidate trees: Sakura, Momiji, Pine, Bamboo)
    populateJapaneseForest(group, 0, 0, 14, 42.5, 66, map, mats, swayingFoliage, n3Exclusions);
    populateStoneToros(group, 0, 0, 29, 12, map, mats);
    populateGrassLogsAndRocks(group, 0, 0, 42, 85, map, mats, swayingFoliage);
  }

  // =========================================================================
  // 4. JUMP PADS, FLOATING LANTERNS, SAKURA PETALS & WIND LEAVES
  // =========================================================================
  const padRings: THREE.Mesh[] = [];
  for (const pad of map.jumpPads) {
    const padMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(pad.radius, pad.radius * 1.18, 0.24, 24),
      mats.pad
    );
    padMesh.position.set(pad.pos[0], pad.pos[1] + 0.12, pad.pos[2]);
    group.add(padMesh);
    padRings.push(padMesh);
  }

  // Drifting golden sky lanterns & floating river lanterns (Toro Nagashi) around the islands
  const floaters: Array<{ mesh: THREE.Mesh; angle: number; radius: number; y: number }> = [];
  const floatGeo = new THREE.BoxGeometry(0.62, 0.88, 0.62);
  const floatMat = new THREE.MeshStandardMaterial({
    color: COLORS.amber,
    emissive: COLORS.amber,
    emissiveIntensity: 1.25,
  });
  for (let i = 0; i < 30; i += 1) {
    const mesh = new THREE.Mesh(floatGeo, floatMat);
    const angle = (i / 30) * Math.PI * 2;
    const radius = (map.night === 2 ? 64 : 52) + (i % 5) * 9;
    const y = i % 3 === 0 ? -9.8 : 2.5 + (i % 6) * 2.2;
    group.add(mesh);
    floaters.push({ mesh, angle, radius, y });
  }

  // Drifting Sakura petals (72 petals across the archipelago)
  const petals: THREE.Mesh[] = [];
  const petalGeo = new THREE.BoxGeometry(0.18, 0.03, 0.13);
  const petalMat = new THREE.MeshBasicMaterial({ color: COLORS.sakuraLight });
  const petalSpan = map.night === 2 ? 120 : 84;
  for (let i = 0; i < 72; i += 1) {
    const p = new THREE.Mesh(petalGeo, petalMat);
    p.position.set(
      seaCenter + ((i * 23) % petalSpan) - petalSpan * 0.5,
      1.2 + (i % 9) * 1.2,
      ((i * 31) % 84) - 42
    );
    group.add(p);
    petals.push(p);
  }

  // Wind swirling gold leaves (Night 3)
  const leaves: THREE.Mesh[] = [];
  const leafGeo = new THREE.BoxGeometry(0.38, 0.05, 0.22);
  const leafMat = new THREE.MeshBasicMaterial({ color: COLORS.gold });
  for (let i = 0; i < 36; i += 1) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    leaf.visible = false;
    leaf.position.set(((i * 17) % 72) - 36, 1 + (i % 6) * 1.4, ((i * 23) % 72) - 36);
    group.add(leaf);
    leaves.push(leaf);
  }

  return {
    group,
    update(
      elapsedSec: number,
      wind: WindState,
      reducedMotion = false,
      dawnProgress = 0,
      litRatio = 0
    ): void {
      const motionMult = reducedMotion ? 0.15 : 1.0;

      // Update sky dome & rising Dawn Sun smoothly as Dawn approaches and lanterns light up
      const combinedDawn = Math.min(1, dawnProgress * 0.72 + litRatio * 0.28);
      skyUniforms.uDawn.value = combinedDawn;
      const sunY = 40 + combinedDawn * 44;
      sunGroup.position.y = sunY;
      skyUniforms.uSunDir.value.set(135, sunY, 330).normalize();

      // Gentle starlight twinkle
      starMat.opacity = reducedMotion ? 0.9 : 0.8 + Math.sin(elapsedSec * 1.6) * 0.14;

      // Shooting stars
      for (const st of shootingStars) {
        if (reducedMotion) {
          st.mesh.visible = false;
          continue;
        }
        const cycle = (elapsedSec + st.offset) % st.period;
        if (cycle < 1.15) {
          const t = cycle / 1.15;
          st.mesh.visible = true;
          st.mesh.position.set(
            st.startX + st.dx * t,
            st.startY + st.dy * t,
            st.startZ + st.dz * t
          );
          st.mesh.lookAt(
            st.startX + st.dx * (t + 0.1),
            st.startY + st.dy * (t + 0.1),
            st.startZ + st.dz * (t + 0.1)
          );
        } else {
          st.mesh.visible = false;
        }
      }

      // Drifting sky clouds
      for (const cl of skyClouds) {
        const a = cl.baseAngle + elapsedSec * cl.speed * motionMult;
        cl.obj.position.set(seaCenter + Math.cos(a) * cl.r, cl.y, Math.sin(a) * cl.r);
        cl.obj.lookAt(seaCenter, cl.y, 0);
      }

      for (const pad of padRings) {
        pad.rotation.y = elapsedSec * 2.2 * motionMult;
      }
      mistRings.forEach((r, idx) => {
        const s = 1 + Math.sin(elapsedSec * 0.6 + idx) * 0.03 * motionMult;
        r.scale.set(s, s, 1);
      });
      for (const pond of waterRipples) {
        const s = 1 + Math.sin(elapsedSec * 2.1) * 0.02 * motionMult;
        pond.scale.set(s, s, 1);
      }
      for (const fl of floaters) {
        const a = fl.angle + elapsedSec * 0.025 * motionMult;
        fl.mesh.position.set(
          seaCenter + Math.cos(a) * fl.radius,
          fl.y + Math.sin(elapsedSec * 1.2 + fl.angle) * 0.4 * motionMult,
          Math.sin(a) * fl.radius
        );
      }

      // Gentle sakura petal drift
      for (let i = 0; i < petals.length; i += 1) {
        const pt = petals[i];
        pt.visible = !reducedMotion;
        if (reducedMotion) continue;
        pt.position.y -= 0.016;
        pt.position.x += Math.sin(elapsedSec + i) * 0.018;
        pt.rotation.z += 0.04;
        pt.rotation.y += 0.03;
        if (pt.position.y < 0.1) {
          pt.position.y = 8.5 + (i % 5);
        }
      }

      // Foliage sway
      const swayAmp = (wind.active ? 0.13 : wind.warning ? 0.075 : 0.03) * motionMult;
      const swayFreq = wind.active ? 5.2 : 2.0;
      for (const item of swayingFoliage) {
        item.obj.rotation.z = item.baseRotZ + Math.sin(elapsedSec * swayFreq + item.phase) * swayAmp;
      }

      // Night 3 Wind leaves
      const showWind = wind.active || wind.warning;
      const wRad = (wind.dirDeg * Math.PI) / 180;
      const speed = (wind.active ? 0.45 : 0.18) * (reducedMotion ? 0.4 : 1.0);
      for (let i = 0; i < leaves.length; i += 1) {
        const leaf = leaves[i];
        leaf.visible = showWind;
        if (!showWind) continue;
        leaf.position.x += Math.cos(wRad) * speed;
        leaf.position.z += Math.sin(wRad) * speed;
        leaf.rotation.y += 0.16;
        if (Math.hypot(leaf.position.x, leaf.position.z) > 48) {
          leaf.position.x = -Math.cos(wRad) * 38 + ((i % 7) - 3) * 4;
          leaf.position.z = -Math.sin(wRad) * 38 + ((i % 5) - 2) * 4;
        }
      }
    },
    dispose(): void {
      scene.remove(group);
    },
  };
}

/** Checks that a scenic building/tree/hill is safely clear of all gameplay objects & corridors. */
function isClearOfGameplay(
  x: number,
  z: number,
  map: NightMapConfig,
  minLanternDist: number
): boolean {
  // Keep spawn area open
  if (Math.hypot(x, z) < 5.5) return false;
  if (map.night === 2 && Math.hypot(x - 70, z) < 5.5) return false;
  // Keep Night 2 bridge approaches open
  if (map.night === 2 && x >= 22 && x <= 48 && Math.abs(z) < 6.5) return false;
  // Keep Night 3 Tier 1/2/ramps open
  if (map.night === 3) {
    const r = Math.hypot(x, z);
    if (r < 11.5) return false;
    if (z > -2 && r >= 10 && r <= 26.5) return false;
    for (const deg of [30, 150]) {
      const rad = (deg * Math.PI) / 180;
      const s = x * Math.cos(rad) + z * Math.sin(rad);
      const w = Math.abs(-x * Math.sin(rad) + z * Math.cos(rad));
      if (w < 5.5 && s >= 21 && s <= 37) return false;
    }
  }
  for (const l of map.lanterns) {
    if (Math.hypot(l.pos[0] - x, l.pos[2] - z) < minLanternDist) return false;
  }
  for (const m of map.moteSpawns) {
    if (Math.hypot(m[0] - x, m[2] - z) < 2.2) return false;
  }
  for (const p of map.jumpPads) {
    if (Math.hypot(p.pos[0] - x, p.pos[2] - z) < 4.0) return false;
  }
  for (const c of map.charms) {
    if (Math.hypot(c.pos[0] - x, c.pos[2] - z) < 3.5) return false;
  }
  return true;
}

/** Builds a grand terraced circular island with exact playable radius + rocky lower coastal cliffs. */
function addGrandCircularIsland(
  group: THREE.Group,
  cx: number,
  cz: number,
  radius: number,
  mats: PaletteMaterials,
  withCliffs: boolean
): void {
  // Exact playable grass deck (Y = 0)
  const top = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius + 1.2, 1.8, 56), mats.grass);
  top.position.set(cx, -0.9, cz);
  group.add(top);

  // Golden sand / stone rim clearly marking playable edge
  const rim = new THREE.Mesh(new THREE.RingGeometry(radius - 1.35, radius, 56), mats.sand);
  rim.rotation.x = -Math.PI / 2;
  rim.position.set(cx, 0.025, cz);
  group.add(rim);

  // Subtle decorative stone curb + courtyard plinth at center
  const centerPlinth = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.8, 0.12, 24), mats.stone);
  centerPlinth.position.set(cx, 0.02, cz);
  group.add(centerPlinth);

  if (withCliffs) {
    // Deep volcanic stone cliff base plunging into the sea of clouds (Y = -1.8..-10.8)
    const lowerCliff = new THREE.Mesh(
      new THREE.CylinderGeometry(radius + 1.0, radius + 9.5, 9.2, 32),
      mats.cliff
    );
    lowerCliff.position.set(cx, -6.3, cz);
    group.add(lowerCliff);

    // Sculpted rocky spurs & lower pine-clad coastal ledges jutting out below the rim
    const spurCount = Math.round(radius * 0.45);
    const rockGeo = new THREE.DodecahedronGeometry(4.5, 0);
    for (let i = 0; i < spurCount; i += 1) {
      const a = (i / spurCount) * Math.PI * 2 + 0.15;
      // Avoid blocking Night 2 bridge corridor
      const sx = cx + Math.cos(a) * (radius + 3.2);
      const sz = cz + Math.sin(a) * (radius + 3.2);
      if (sx > 23 && sx < 47 && Math.abs(sz) < 6) continue;
      const crag = new THREE.Mesh(rockGeo, i % 3 === 0 ? mats.hill : mats.cliff);
      crag.position.set(sx, -4.6 - (i % 3) * 1.1, sz);
      crag.scale.set(1.2 + (i % 3) * 0.35, 1.15, 1.1 + (i % 2) * 0.4);
      crag.rotation.y = a;
      group.add(crag);
    }
  }
}

/** Builds a breathtaking 360-degree ancient Japanese mountain & temple island panorama on the horizon. */
function addSurroundingMountainArchipelago(
  group: THREE.Group,
  centerX: number,
  night: number,
  mats: PaletteMaterials
): void {
  // 1. Sacred Snow-Capped Mt. Fuji Peak framing the rising Dawn Sun in the +Z horizon (visible right at spawn!)
  const fujiGroup = new THREE.Group();
  const fujiBody = new THREE.Mesh(new THREE.ConeGeometry(96, 86, 24), mats.cliff);
  fujiBody.position.y = 36;
  fujiGroup.add(fujiBody);
  const fujiSnow = new THREE.Mesh(new THREE.ConeGeometry(31, 29, 24), mats.snow);
  fujiSnow.position.y = 65.2;
  fujiGroup.add(fujiSnow);
  fujiGroup.position.set(centerX + 82, -10.5, 255);
  group.add(fujiGroup);

  // 2. Layered ring of 18 coastal Japanese mountain peaks & ridges across the cloud sea
  const ringRadiusBase = night === 2 ? 158 : 136;
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2 + 0.18;
    const dist = ringRadiusBase + (i % 4) * 36;
    const height = 24 + ((i * 19) % 44);
    const width = 26 + ((i * 13) % 26);
    const mx = centerX + Math.cos(a) * dist;
    const mz = Math.sin(a) * dist;

    // Keep clean silhouette vista around Mt. Fuji & rising Dawn Sun (+Z)
    if (Math.hypot(mx - (centerX + 82), mz - 255) < 90) continue;
    if (mz > 110 && Math.abs(mx - centerX) < 55) continue;

    const mtn = new THREE.Group();
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(width, height, 7),
      i % 2 === 0 ? mats.hill : mats.cliff
    );
    peak.position.y = height * 0.5;
    peak.rotation.y = i * 0.7;
    mtn.add(peak);

    // Secondary shoulder ridge
    const shoulder = new THREE.Mesh(new THREE.ConeGeometry(width * 0.72, height * 0.65, 6), mats.cliff);
    shoulder.position.set(width * 0.45, height * 0.32, width * 0.25);
    mtn.add(shoulder);

    // Snow cap on tallest peaks
    if (height > 54) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(width * 0.32, height * 0.32, 7), mats.snow);
      cap.position.y = height * 0.84;
      cap.rotation.y = i * 0.7;
      mtn.add(cap);
    }

    mtn.position.set(mx, -10.8, mz);
    group.add(mtn);
  }

  // 3. Scenic Nearby Satellite Temple Islets (with glowing 5-tier Pagodas, Torii gates in water & Pine groves)
  const isletAngles = [0.45, 1.35, 2.55, 3.65, 4.9, 5.75];
  const isletBaseR = night === 2 ? 105 : 82;
  isletAngles.forEach((a, idx) => {
    const r = isletBaseR + (idx % 2) * 20;
    const ix = centerX + Math.cos(a) * r;
    const iz = Math.sin(a) * r;
    const islet = new THREE.Group();

    const baseR = 11 + (idx % 3) * 3.5;
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR + 4.5, 9, 14), mats.cliff);
    cliff.position.y = -5.5;
    islet.add(cliff);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(baseR, baseR + 0.5, 1.4, 14), mats.grass);
    cap.position.y = -0.5;
    islet.add(cap);

    if (idx % 2 === 0) {
      addJapanesePagoda(islet, 0, 0.2, 0, 5, 0.75, mats);
    } else {
      addJapaneseHouse(islet, -1.5, 0.2, 0, a + Math.PI, 1.15, true, mats);
      addToriiGate(islet, Math.cos(a + Math.PI) * 5.5, 0.2, Math.sin(a + Math.PI) * 5.5, -a, mats.torii, mats.woodDark, mats.gold, 0.9);
    }
    // Pine & Sakura crowns on the satellite islet
    for (let t = 0; t < 5; t += 1) {
      const ta = (t / 5) * Math.PI * 2;
      const tr = baseR * 0.62;
      if (t % 2 === 0) addPineTree(islet, Math.cos(ta) * tr, 0.2, Math.sin(ta) * tr, 1.15, mats);
      else addSakuraTree(islet, Math.cos(ta) * tr, 0.2, Math.sin(ta) * tr, 1.0, mats);
    }

    islet.position.set(ix, -1.5 + (idx % 3) * 1.4, iz);
    group.add(islet);
  });

  // 4. Floating Itsukushima-style Red Water Torii Gate standing majestically in the sea of clouds
  const waterToriiAngle = -2.35;
  const wtx = centerX + Math.cos(waterToriiAngle) * (night === 2 ? 84 : 62);
  const wtz = Math.sin(waterToriiAngle) * (night === 2 ? 84 : 62);
  addToriiGate(group, wtx, -9.8, wtz, 0.7, mats.torii, mats.woodDark, mats.gold, 2.2);
}

/** Adds an ornate multi-story Japanese Pagoda (Goju-no-to / Sanju-no-to) with glowing shoji tiers. */
function addJapanesePagoda(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  tiers: number,
  scale: number,
  mats: PaletteMaterials
): void {
  const pag = new THREE.Group();

  // Stone foundation platform
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.9, 5.2), mats.stone);
  plinth.position.y = 0.45;
  pag.add(plinth);

  let curY = 0.9;
  for (let i = 0; i < tiers; i += 1) {
    const shrink = 1 - i * 0.13;
    const bodyW = 3.4 * shrink;
    const bodyH = 2.05 * (1 - i * 0.05);

    const core = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyW), mats.plaster);
    core.position.y = curY + bodyH * 0.5;
    pag.add(core);

    // Vermilion corner trim & glowing shoji window bands
    const shojiBand = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.08, bodyH * 0.42, bodyW + 0.08),
      mats.shoji
    );
    shojiBand.position.y = curY + bodyH * 0.5;
    pag.add(shojiBand);

    const beamBand = new THREE.Mesh(
      new THREE.BoxGeometry(bodyW + 0.25, 0.22, bodyW + 0.25),
      mats.torii
    );
    beamBand.position.y = curY + bodyH * 0.92;
    pag.add(beamBand);

    // Flared dark tiled pagoda eaves
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(bodyW * 1.18, 1.15 * shrink, 4),
      mats.roofTile
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = curY + bodyH + 0.52 * shrink;
    pag.add(roof);

    curY += bodyH + 0.65 * shrink;
  }

  // Golden Sorin spire on top
  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 2.8, 8), mats.gold);
  spire.position.y = curY + 1.3;
  pag.add(spire);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), mats.gold);
  jewel.position.y = curY + 2.75;
  pag.add(jewel);

  pag.scale.setScalar(scale);
  pag.position.set(x, y, z);
  parent.add(pag);
}

/** Builds an Imperial Japanese Bell Tower (Shoro) for Night 3 Tier 2 (fits within r=2m physics cylinder). */
function addImperialBellTower(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  mats: PaletteMaterials
): void {
  const tower = new THREE.Group();

  // Raised carved stone base (radius 2.0m)
  const stoneBase = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 2.05, 1.2, 12), mats.stone);
  stoneBase.position.y = 0.6;
  tower.add(stoneBase);

  // Lower sanctuary hall with warm glowing shoji panels
  const lowerHall = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.75, 3.2, 8), mats.woodDark);
  lowerHall.position.y = 2.8;
  tower.add(lowerHall);
  const shojiRing = new THREE.Mesh(new THREE.CylinderGeometry(1.72, 1.72, 1.6, 8), mats.shoji);
  shojiRing.position.y = 2.9;
  tower.add(shojiRing);

  // Lower curved shrine eaves
  const lowerEaves = new THREE.Mesh(new THREE.ConeGeometry(3.4, 1.4, 8), mats.roofTile);
  lowerEaves.position.y = 4.95;
  tower.add(lowerEaves);
  const lowerTrim = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 3.35, 0.24, 8), mats.torii);
  lowerTrim.position.y = 4.35;
  tower.add(lowerTrim);

  // Open belfry chamber with 4 vermilion pillars & gleaming bronze Bonsho temple bell
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.8, 8), mats.torii);
    p.position.set(Math.cos(a) * 1.45, 6.7, Math.sin(a) * 1.45);
    tower.add(p);
  }
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.82, 1.35, 16), mats.gold);
  bell.position.y = 6.75;
  tower.add(bell);
  const bellBeam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.22, 0.22), mats.woodDark);
  bellBeam.position.y = 7.75;
  tower.add(bellBeam);

  // Grand upper curved temple roof + golden Sorin pinnacle
  const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(3.55, 2.15, 8), mats.roofTile);
  upperRoof.position.y = 9.05;
  tower.add(upperRoof);
  const upperTrim = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.5, 0.22, 8), mats.gold);
  upperTrim.position.y = 8.05;
  tower.add(upperTrim);

  const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 1.9, 8), mats.gold);
  spire.position.y = 10.95;
  tower.add(spire);

  tower.position.set(x, y, z);
  parent.add(tower);
}

/** Builds a detailed traditional Japanese Machiya house or two-story Teahouse with glowing shoji & chochin. */
function addJapaneseHouse(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotY: number,
  scale: number,
  twoStory: boolean,
  mats: PaletteMaterials
): void {
  const house = new THREE.Group();

  // Stone plinth + wooden veranda (engawa)
  const base = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.42, 3.8), mats.stone);
  base.position.y = 0.21;
  house.add(base);

  // First floor timber-and-plaster body
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.4, 3.3), mats.plaster);
  body.position.y = 1.62;
  house.add(body);

  // Dark wood timber corner posts
  for (const px of [-2.08, 2.08]) {
    for (const pz of [-1.62, 1.62]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.5, 0.18), mats.woodDark);
      post.position.set(px, 1.65, pz);
      house.add(post);
    }
  }

  // Glowing golden shoji sliding doors front, back & sides
  const winFront = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.45), mats.shoji);
  winFront.position.set(0, 1.48, 1.67);
  house.add(winFront);
  const winBack = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.25), mats.shoji);
  winBack.rotation.y = Math.PI;
  winBack.position.set(0, 1.55, -1.67);
  house.add(winBack);
  for (const side of [-1, 1]) {
    const winSide = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.1), mats.shoji);
    winSide.rotation.y = side * (Math.PI / 2);
    winSide.position.set(side * 2.12, 1.6, 0);
    house.add(winSide);
  }

  // Hanging red Chochin lanterns by front entrance
  addHangingChochin(house, -1.55, 2.35, 1.95, mats.chochin, mats.woodDark);
  addHangingChochin(house, 1.55, 2.35, 1.95, mats.chochin, mats.woodDark);

  // Lower sloped kawara tiled roof
  const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.85, 1.55, 4), mats.roofTile);
  lowerRoof.rotation.y = Math.PI / 4;
  lowerRoof.position.y = 3.55;
  house.add(lowerRoof);

  if (twoStory) {
    const upperBody = new THREE.Mesh(new THREE.BoxGeometry(3.1, 1.75, 2.45), mats.plaster);
    upperBody.position.y = 4.65;
    house.add(upperBody);
    const upperWin = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 0.95), mats.shoji);
    upperWin.position.set(0, 4.7, 1.25);
    house.add(upperWin);
    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(3.0, 1.4, 4), mats.roofTile);
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.position.y = 6.15;
    house.add(upperRoof);
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.2), mats.gold);
    ridge.position.y = 6.82;
    house.add(ridge);
  } else {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.2), mats.gold);
    ridge.position.y = 4.28;
    house.add(ridge);
  }

  house.scale.setScalar(scale);
  house.position.set(x, y, z);
  house.rotation.y = rotY;
  parent.add(house);
}

/** Builds a miniature rocky mountain crag on the island perimeter topped with a twisted pine & stone lantern. */
function addIslandHillCrag(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  mats: PaletteMaterials,
  swaying: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }>
): void {
  const crag = new THREE.Group();
  const mainRock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 0), mats.cliff);
  mainRock.scale.set(1.25, 1.1, 1.15);
  mainRock.position.y = 1.3;
  crag.add(mainRock);

  const sideRock = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 0), mats.hill);
  sideRock.position.set(1.6, 0.85, 0.9);
  crag.add(sideRock);

  const pine = addPineTree(crag, -0.3, 2.5, -0.2, 0.88, mats);
  swaying.push({ obj: pine, phase: x * 0.2, baseRotZ: 0 });

  crag.scale.setScalar(scale);
  crag.position.set(x, y, z);
  group.add(crag);
}

function addHangingChochin(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  chochinMat: THREE.Material,
  darkMat: THREE.Material
): void {
  const ch = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), chochinMat);
  body.scale.set(0.85, 1.25, 0.85);
  ch.add(body);
  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.08, 8), darkMat);
  topCap.position.y = 0.26;
  ch.add(topCap);
  const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.12, 0.08, 8), darkMat);
  botCap.position.y = -0.26;
  ch.add(botCap);
  ch.position.set(x, y, z);
  parent.add(ch);
}

function addStonePathsToLanterns(
  group: THREE.Group,
  cx: number,
  cz: number,
  lanterns: NightMapConfig["lanterns"],
  stoneMat: THREE.Material
): void {
  const stepGeo = new THREE.CylinderGeometry(0.58, 0.66, 0.07, 8);
  for (const l of lanterns) {
    const dx = l.pos[0] - cx;
    const dz = l.pos[2] - cz;
    const dist = Math.hypot(dx, dz);
    const steps = Math.floor(dist / 2.4);
    for (let s = 2; s < steps; s += 1) {
      const t = s / steps;
      const stone = new THREE.Mesh(stepGeo, stoneMat);
      stone.position.set(cx + dx * t + Math.sin(s * 1.4) * 0.22, 0.025, cz + dz * t);
      group.add(stone);
    }
  }
}

function addToriiGate(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  rotY: number,
  redMat: THREE.Material,
  darkMat: THREE.Material,
  goldMat: THREE.Material,
  scale = 1.0
): void {
  const gate = new THREE.Group();
  for (const sx of [-1.8, 1.8]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 4.2, 10), redMat);
    pillar.position.set(sx, 2.1, 0);
    gate.add(pillar);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.5, 10), darkMat);
    base.position.set(sx, 0.25, 0);
    gate.add(base);
  }
  const lowerBeam = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.24, 0.28), redMat);
  lowerBeam.position.set(0, 3.25, 0);
  gate.add(lowerBeam);
  const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.14), goldMat);
  plaque.position.set(0, 3.68, 0);
  gate.add(plaque);
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.3, 0.38), redMat);
  topBeam.position.set(0, 4.12, 0);
  gate.add(topBeam);
  const topCap = new THREE.Mesh(new THREE.BoxGeometry(5.65, 0.16, 0.46), darkMat);
  topCap.position.set(0, 4.32, 0);
  gate.add(topCap);

  gate.scale.setScalar(scale);
  gate.position.set(x, y, z);
  gate.rotation.y = rotY;
  parent.add(gate);
}

function addStoneToro(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  stoneMat: THREE.Material,
  shojiMat: THREE.Material
): void {
  const toro = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, 0.22, 6), stoneMat);
  base.position.y = 0.11;
  toro.add(base);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 1.15, 6), stoneMat);
  post.position.y = 0.75;
  toro.add(post);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.34), shojiMat);
  glow.position.y = 1.48;
  toro.add(glow);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.32, 6), stoneMat);
  cap.position.y = 1.82;
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
  mats: PaletteMaterials
): THREE.Mesh {
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 28),
    new THREE.MeshStandardMaterial({
      color: 0x1a6882,
      emissive: 0x0c3042,
      emissiveIntensity: 0.55,
      roughness: 0.18,
      metalness: 0.38,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(x, y, z);
  group.add(water);

  const rockGeo = new THREE.DodecahedronGeometry(0.52, 0);
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const rock = new THREE.Mesh(rockGeo, mats.stone);
    rock.position.set(x + Math.cos(a) * radius, y + 0.16, z + Math.sin(a) * radius);
    rock.scale.set(1.25, 0.65, 1.0);
    group.add(rock);
  }
  // Pink glowing lotus blossoms on water
  for (let i = 0; i < 4; i += 1) {
    const a = i * 1.6 + 0.5;
    const lr = radius * 0.45;
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 10), mats.bamboo);
    pad.position.set(x + Math.cos(a) * lr, y + 0.03, z + Math.sin(a) * lr);
    group.add(pad);
    const flower = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.18, 6), mats.sakuraLight);
    flower.position.set(x + Math.cos(a) * lr, y + 0.12, z + Math.sin(a) * lr);
    group.add(flower);
  }
  return water;
}

/** Populates a lush, dense mixed Ancient Japanese forest (Sakura, Momiji, Pine, Bamboo). */
function populateJapaneseForest(
  group: THREE.Group,
  cx: number,
  cz: number,
  minR: number,
  maxR: number,
  count: number,
  map: NightMapConfig,
  mats: PaletteMaterials,
  swaying: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }>,
  exclusions: Array<[number, number, number]>
): void {
  for (let i = 0; i < count; i += 1) {
    const a = i * 2.3999632 + 0.4;
    const frac = (i + 0.5) / count;
    const r = minR + Math.sqrt(frac) * (maxR - minR);
    const tx = cx + Math.cos(a) * r;
    const tz = cz + Math.sin(a) * r;

    if (!isClearOfGameplay(tx, tz, map, 4.4)) continue;
    if (exclusions.some(([ex, ez, er]) => Math.hypot(tx - ex, tz - ez) < er)) continue;

    const scale = 0.85 + (i % 4) * 0.15;
    const kind = i % 5;
    let tree: THREE.Group;
    if (kind === 0 || kind === 3) {
      tree = addSakuraTree(group, tx, 0, tz, scale, mats);
    } else if (kind === 1) {
      tree = addMomijiTree(group, tx, 0, tz, scale, mats);
    } else if (kind === 2) {
      tree = addPineTree(group, tx, 0, tz, scale, mats);
    } else {
      tree = addBambooCluster(group, tx, 0, tz, mats);
    }
    swaying.push({ obj: tree, phase: i * 0.65, baseRotZ: 0 });
  }
}

function populateStoneToros(
  group: THREE.Group,
  cx: number,
  cz: number,
  radius: number,
  count: number,
  map: NightMapConfig,
  mats: PaletteMaterials
): void {
  for (let i = 0; i < count; i += 1) {
    const a = (i / count) * Math.PI * 2 + 0.25;
    const tx = cx + Math.cos(a) * radius;
    const tz = cz + Math.sin(a) * radius;
    if (!isClearOfGameplay(tx, tz, map, 3.8)) continue;
    addStoneToro(group, tx, 0, tz, mats.stone, mats.shoji);
  }
}

function addSakuraTree(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  mats: PaletteMaterials
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.4, 3.4, 8), mats.woodDark);
  trunk.position.y = 1.7;
  tree.add(trunk);

  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const puff = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.3 - (i % 2) * 0.22, 0),
      i % 2 === 0 ? mats.sakura : mats.sakuraLight
    );
    puff.position.set(Math.cos(a) * 0.9, 3.25 + (i % 3) * 0.42, Math.sin(a) * 0.9);
    tree.add(puff);
  }
  const crownTop = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1, 0), mats.sakuraLight);
  crownTop.position.set(0, 4.15, 0);
  tree.add(crownTop);

  tree.scale.setScalar(scale);
  tree.position.set(x, y, z);
  parent.add(tree);
  return tree;
}

function addMomijiTree(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  mats: PaletteMaterials
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 3.0, 7), mats.woodDark);
  trunk.position.y = 1.5;
  tree.add(trunk);

  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const puff = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.18 - (i % 2) * 0.2, 0),
      i % 2 === 0 ? mats.momijiRed : mats.momijiAmber
    );
    puff.position.set(Math.cos(a) * 0.85, 2.9 + (i % 2) * 0.55, Math.sin(a) * 0.85);
    tree.add(puff);
  }
  const topPuff = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), mats.momijiRed);
  topPuff.position.y = 3.85;
  tree.add(topPuff);

  tree.scale.setScalar(scale);
  tree.position.set(x, y, z);
  parent.add(tree);
  return tree;
}

function addPineTree(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  scale: number,
  mats: PaletteMaterials
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.32, 3.6, 7), mats.wood);
  trunk.position.y = 1.8;
  tree.add(trunk);

  for (let t = 0; t < 3; t += 1) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.85 - t * 0.42, 1.85 - t * 0.2, 8),
      mats.pine
    );
    cone.position.y = 2.6 + t * 1.18;
    tree.add(cone);
  }
  tree.scale.setScalar(scale);
  tree.position.set(x, y, z);
  parent.add(tree);
  return tree;
}

function addBambooCluster(
  parent: THREE.Group,
  x: number,
  y: number,
  z: number,
  mats: PaletteMaterials
): THREE.Group {
  const grove = new THREE.Group();
  for (let i = 0; i < 5; i += 1) {
    const h = 4.2 + (i % 3) * 1.1;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, h, 6), mats.bamboo);
    stalk.position.set(((i % 3) - 1) * 0.45, h * 0.5, (Math.floor(i / 3) - 0.5) * 0.55);
    grove.add(stalk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.05, 6), mats.lush);
    crown.position.set(stalk.position.x, h + 0.25, stalk.position.z);
    grove.add(crown);
  }
  grove.position.set(x, y, z);
  parent.add(grove);
  return grove;
}

function populateGrassLogsAndRocks(
  group: THREE.Group,
  cx: number,
  cz: number,
  maxRadius: number,
  count: number,
  map: NightMapConfig,
  mats: PaletteMaterials,
  swaying: Array<{ obj: THREE.Object3D; phase: number; baseRotZ: number }>
): void {
  const bladeGeo = new THREE.ConeGeometry(0.14, 0.55, 5);
  const rockGeo = new THREE.DodecahedronGeometry(0.42, 0);
  const logGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.6, 7);

  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.39996;
    const r = 5.0 + ((i * 13) % Math.max(6, maxRadius - 6));
    const gx = cx + Math.cos(angle) * r;
    const gz = cz + Math.sin(angle) * r;

    // Keep Night 3 Tier 1/ramps clean of random ground clutter
    if (map.night === 3 && gz > 0 && r > 11 && r < 31) continue;

    const tuft = new THREE.Group();
    for (let b = 0; b < 3; b += 1) {
      const blade = new THREE.Mesh(bladeGeo, mats.lush);
      blade.position.set((b - 1) * 0.14, 0.25, (b % 2) * 0.1);
      blade.rotation.z = (b - 1) * 0.18;
      tuft.add(blade);
    }
    tuft.position.set(gx, 0, gz);
    group.add(tuft);
    swaying.push({ obj: tuft, phase: i * 0.5, baseRotZ: 0 });

    if (i % 6 === 0 && isClearOfGameplay(gx + 0.5, gz - 0.4, map, 3.0)) {
      const rock = new THREE.Mesh(rockGeo, mats.stone);
      rock.position.set(gx + 0.5, 0.14, gz - 0.4);
      rock.scale.set(1.2, 0.7, 1.0);
      group.add(rock);
    }
    if (i % 13 === 0 && isClearOfGameplay(gx - 0.6, gz + 0.5, map, 3.5)) {
      const log = new THREE.Mesh(logGeo, mats.woodDark);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = angle;
      log.position.set(gx - 0.6, 0.16, gz + 0.5);
      group.add(log);
    }
  }
}
