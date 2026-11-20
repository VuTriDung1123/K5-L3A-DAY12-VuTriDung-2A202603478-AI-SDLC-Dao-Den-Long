import { SHADE_DEFAULT_Y } from "./config.js";
import { round3 } from "./prng.js";
import type { LanternState, NightNumber, Vec3 } from "./types.js";

export interface JumpPadSpec {
  pos: Vec3;
  radius: number;
  vy: number;
  horizSpeed: number;
  targetXZ: [number, number];
}

export interface CharmSpec {
  id: string;
  pos: Vec3;
}

export interface NightMapConfig {
  night: NightNumber;
  name: string;
  durationS: number;
  lanterns: LanternState[];
  moteSpawns: Vec3[];
  shadeSpawns: Vec3[];
  shadeIntervalTicks: number;
  maxShades: number;
  shadeSpeed: number;
  jumpPads: JumpPadSpec[];
  charms: CharmSpec[];
  driftersEnabled: boolean;
  windEnabled: boolean;
}

const NIGHT3_RAMP_ANGLES_RAD = [(30 * Math.PI) / 180, (150 * Math.PI) / 180];
const NIGHT3_TOWER_RADIUS = 2.0;

/** Computes (x, z) from radius and angle in degrees (+X is 0 deg, CCW from above: x=r*cos, z=r*sin). */
export function polarXZ(radius: number, deg: number, offsetX = 0, offsetZ = 0): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [round3(offsetX + radius * Math.cos(rad)), round3(offsetZ + radius * Math.sin(rad))];
}

function buildRingPoints(
  radius: number,
  y: number,
  stepDeg: number,
  startDeg = 0,
  count?: number,
  offsetX = 0,
  offsetZ = 0
): Vec3[] {
  const total = count ?? Math.round(360 / stepDeg);
  const pts: Vec3[] = [];
  for (let i = 0; i < total; i += 1) {
    const deg = startDeg + i * stepDeg;
    const [x, z] = polarXZ(radius, deg, offsetX, offsetZ);
    pts.push([x, y, z]);
  }
  return pts;
}

/** Returns exact standardized map layout, spawn points, lanterns, and hazards for Night 1, 2, or 3. */
export function getNightMapConfig(night: NightNumber): NightMapConfig {
  if (night === 1) {
    return {
      night: 1,
      name: "Đảo Bến",
      durationS: 300,
      lanterns: [
        { id: "L1", pos: [0, 0, 25], lit: false, deposited: 0 },
        { id: "L2", pos: [23.8, 0, 7.7], lit: false, deposited: 0 },
        { id: "L3", pos: [14.7, 0, -20.2], lit: false, deposited: 0 },
        { id: "L4", pos: [-14.7, 0, -20.2], lit: false, deposited: 0 },
        { id: "L5", pos: [-23.8, 0, 7.7], lit: false, deposited: 0 },
      ],
      moteSpawns: [
        ...buildRingPoints(12, 0, 45, 0, 8),
        ...buildRingPoints(33, 0, 22.5, 0, 16),
      ],
      shadeSpawns: buildRingPoints(37, SHADE_DEFAULT_Y, 30, 15, 12),
      shadeIntervalTicks: 480,
      maxShades: 6,
      shadeSpeed: 4.0,
      jumpPads: [],
      charms: [],
      driftersEnabled: false,
      windEnabled: false,
    };
  }

  if (night === 2) {
    return {
      night: 2,
      name: "Đảo Cau",
      durationS: 330,
      lanterns: [
        { id: "L1", pos: [0, 0, 20], lit: false, deposited: 0 },
        { id: "L2", pos: [17, 0, -10], lit: false, deposited: 0 },
        { id: "L3", pos: [-17, 0, -10], lit: false, deposited: 0 },
        { id: "L4", pos: [70, 0, 20], lit: false, deposited: 0 },
        { id: "L5", pos: [87, 0, -10], lit: false, deposited: 0 },
        { id: "L6", pos: [53, 0, -10], lit: false, deposited: 0 },
      ],
      moteSpawns: [
        ...buildRingPoints(10, 0, 90, 0, 4, 0, 0),
        ...buildRingPoints(22, 0, 45, 0, 8, 0, 0),
        ...buildRingPoints(10, 0, 90, 0, 4, 70, 0),
        ...buildRingPoints(22, 0, 45, 0, 8, 70, 0),
      ],
      shadeSpawns: [
        ...buildRingPoints(26, SHADE_DEFAULT_Y, 45, 22.5, 8, 0, 0),
        ...buildRingPoints(26, SHADE_DEFAULT_Y, 45, 22.5, 8, 70, 0),
      ],
      shadeIntervalTicks: 420,
      maxShades: 8,
      shadeSpeed: 4.0,
      jumpPads: [
        { pos: [20, 0, 18], radius: 1, vy: 14, horizSpeed: 24, targetXZ: [70, 0] },
        { pos: [50, 0, -18], radius: 1, vy: 14, horizSpeed: 24, targetXZ: [0, 0] },
      ],
      charms: [{ id: "C1", pos: [35, 0, 0] }],
      driftersEnabled: true,
      windEnabled: false,
    };
  }

  return {
    night: 3,
    name: "Đảo Chuông",
    durationS: 360,
    lanterns: [
      { id: "L1", pos: [0, 6, 6], lit: false, deposited: 0 },
      { id: "L2", pos: [18, 3, 10], lit: false, deposited: 0 },
      { id: "L3", pos: [-18, 3, 10], lit: false, deposited: 0 },
      { id: "L4", pos: [35, 0, -10], lit: false, deposited: 0 },
      { id: "L5", pos: [-35, 0, -10], lit: false, deposited: 0 },
      { id: "L6", pos: [20, 0, -35], lit: false, deposited: 0 },
      { id: "L7", pos: [-20, 0, -35], lit: false, deposited: 0 },
    ],
    moteSpawns: [
      ...buildRingPoints(34, 0, 20, 0, 18),
      ...buildRingPoints(18, 3, 20, 20, 8),
      ...buildRingPoints(5, 6, 90, 45, 4),
    ],
    shadeSpawns: buildRingPoints(43, SHADE_DEFAULT_Y, 22.5, 0, 16),
    shadeIntervalTicks: 360,
    maxShades: 10,
    shadeSpeed: 4.5,
    jumpPads: [{ pos: [0, 3, 13], radius: 1, vy: 12, horizSpeed: 8, targetXZ: [0, 0] }],
    charms: [
      { id: "C1", pos: [30, 0, 25] },
      { id: "C2", pos: [-30, 0, 25] },
    ],
    driftersEnabled: true,
    windEnabled: true,
  };
}

/** Checks if (x, z) lies on one of the two Night 3 radial ramps and returns its surface Y. */
function getNight3RampY(x: number, z: number): number | null {
  for (const alpha of NIGHT3_RAMP_ANGLES_RAD) {
    const ux = Math.cos(alpha);
    const uz = Math.sin(alpha);
    const vx = -uz;
    const vz = ux;
    const s = x * ux + z * uz;
    const w = Math.abs(x * vx + z * vz);
    if (w <= 1.5 && s >= 23.8 && s <= 30.2) {
      return Math.max(0, Math.min(3, (30 - s) * 0.5));
    }
  }
  return null;
}

/** Checks whether a point at height currentY is blocked by a solid vertical obstacle in Night 3. */
export function isBlockedByObstacle(night: NightNumber, x: number, y: number, z: number): boolean {
  if (night !== 3) return false;
  const r = Math.hypot(x, z);
  // Central bell tower on Tier 2 (radius 2m, Y in [6, 14])
  if (r < NIGHT3_TOWER_RADIUS - 1e-4 && y >= 5.5) {
    return true;
  }
  return false;
}

/**
 * Returns the highest walkable ground surface Y directly beneath or slightly below currentY,
 * or null if (x, z) is over the void/cloud sea.
 */
export function getSupportGroundY(night: NightNumber, x: number, z: number, currentY: number): number | null {
  if (night === 1) {
    return Math.hypot(x, z) <= 40 + 1e-4 ? 0 : null;
  }

  if (night === 2) {
    const onIslandA = Math.hypot(x, z) <= 28 + 1e-4;
    const onIslandB = Math.hypot(x - 70, z) <= 28 + 1e-4;
    const onBridge = x >= 26 - 1e-4 && x <= 44 + 1e-4 && z >= -2 - 1e-4 && z <= 2 + 1e-4;
    return onIslandA || onIslandB || onBridge ? 0 : null;
  }

  // Night 3 multi-tier surfaces
  const r = Math.hypot(x, z);
  const candidates: number[] = [];

  if (r <= 8 + 1e-4 && r >= NIGHT3_TOWER_RADIUS - 1e-4) {
    candidates.push(6);
  }
  const rampY = getNight3RampY(x, z);
  if (rampY !== null) {
    candidates.push(rampY);
  }
  if (r >= 12 - 1e-4 && r <= 24 + 1e-4 && z > 0) {
    candidates.push(3);
  }
  if (r <= 45 + 1e-4) {
    candidates.push(0);
  }

  let best: number | null = null;
  for (const cy of candidates) {
    if (cy <= currentY + 0.45 && (best === null || cy > best)) {
      best = cy;
    }
  }
  return best;
}

/** Resolves horizontal player movement against solid cliffs and the Night 3 bell tower. */
export function resolvePlayerHorizontalMove(
  night: NightNumber,
  px: number,
  py: number,
  pz: number,
  nx: number,
  nz: number
): [number, number] {
  if (night !== 3) {
    return [nx, nz];
  }

  let rx = nx;
  let rz = nz;
  // Push cleanly outside central bell tower if colliding at Tier 2 height
  const r = Math.hypot(rx, rz);
  if (r < NIGHT3_TOWER_RADIUS && py >= 5.65) {
    if (r > 1e-6) {
      const scale = NIGHT3_TOWER_RADIUS / r;
      rx *= scale;
      rz *= scale;
    } else {
      rx = NIGHT3_TOWER_RADIUS;
      rz = 0;
    }
  }

  if (!isBlockedByObstacle(night, rx, py, rz)) {
    return [rx, rz];
  }
  // Axis slide against vertical walls
  if (!isBlockedByObstacle(night, rx, py, pz)) {
    return [rx, pz];
  }
  if (!isBlockedByObstacle(night, px, py, rz)) {
    return [px, rz];
  }
  return [px, pz];
}
