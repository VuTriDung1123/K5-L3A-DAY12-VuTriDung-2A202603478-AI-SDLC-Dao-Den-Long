import type {
  DrifterBehaviorState,
  FrameInput,
  InputsConfig,
  MoteKind,
  ScenarioCharmOverride,
  ScenarioConfig,
  ScenarioDrifterOverride,
  ScenarioLanternOverride,
  ScenarioMoteOverride,
  ScenarioShadeOverride,
  ShadeBehaviorState,
  Vec3,
} from "./types.js";

/** Thrown when scenario or inputs JSON violates Test Contract v1.2 schema. */
export class ContractFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractFormatError";
  }
}

const VALID_SHADE_STATES = new Set<ShadeBehaviorState>([
  "spawning",
  "wander",
  "chase",
  "recoil",
  "stunned",
  "drain",
]);

const VALID_DRIFTER_STATES = new Set<DrifterBehaviorState>(["idle", "chase", "flee", "removed"]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertVec3(value: unknown, context: string): Vec3 {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new ContractFormatError(`${context} must be a [x, y, z] array of 3 numbers`);
  }
  for (let i = 0; i < 3; i += 1) {
    if (typeof value[i] !== "number" || !Number.isFinite(value[i])) {
      throw new ContractFormatError(`${context}[${i}] must be a finite number`);
    }
  }
  return [value[0], value[1], value[2]];
}

function assertNonNegInt(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new ContractFormatError(`${context} must be a non-negative integer`);
  }
  return value;
}

function assertNonNegNumber(value: unknown, context: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new ContractFormatError(`${context} must be a non-negative finite number`);
  }
  return value;
}

/** Validates and parses an inputs JSON object according to Test Contract v1.2. */
export function validateInputsConfig(raw: unknown): InputsConfig {
  if (!isPlainObject(raw) || !Array.isArray(raw.frames)) {
    throw new ContractFormatError('inputs JSON must be an object with a "frames" array');
  }

  const frames: FrameInput[] = [];
  let prevTick = -1;

  for (let i = 0; i < raw.frames.length; i += 1) {
    const entry = raw.frames[i];
    if (!isPlainObject(entry)) {
      throw new ContractFormatError(`frames[${i}] must be an object`);
    }

    const tick = assertNonNegInt(entry.tick, `frames[${i}].tick`);
    if (tick <= prevTick) {
      throw new ContractFormatError(
        `frames[${i}].tick (${tick}) must be strictly increasing (previous was ${prevTick})`
      );
    }
    prevTick = tick;

    const frame: FrameInput = { tick };

    if (entry.move !== undefined) {
      if (!Array.isArray(entry.move) || entry.move.length !== 2) {
        throw new ContractFormatError(`frames[${i}].move must be [x, z]`);
      }
      const [mx, mz] = entry.move;
      if (
        typeof mx !== "number" ||
        typeof mz !== "number" ||
        !Number.isFinite(mx) ||
        !Number.isFinite(mz) ||
        mx < -1 ||
        mx > 1 ||
        mz < -1 ||
        mz > 1
      ) {
        throw new ContractFormatError(`frames[${i}].move components must be finite numbers in [-1, 1]`);
      }
      frame.move = [mx, mz];
    }

    if (entry.cam_yaw_deg !== undefined) {
      if (typeof entry.cam_yaw_deg !== "number" || !Number.isFinite(entry.cam_yaw_deg)) {
        throw new ContractFormatError(`frames[${i}].cam_yaw_deg must be a finite number`);
      }
      frame.cam_yaw_deg = entry.cam_yaw_deg;
    }

    for (const key of ["jump", "interact", "pulse", "dash", "pause"] as const) {
      if (entry[key] !== undefined) {
        if (typeof entry[key] !== "boolean") {
          throw new ContractFormatError(`frames[${i}].${key} must be a boolean`);
        }
        frame[key] = entry[key];
      }
    }

    frames.push(frame);
  }

  return { frames };
}

/** Validates and parses a scenario JSON object according to Test Contract v1.2. */
export function validateScenarioConfig(raw: unknown, validLanternIds: Set<string>): ScenarioConfig {
  if (!isPlainObject(raw)) {
    throw new ContractFormatError("scenario JSON must be an object");
  }

  const out: ScenarioConfig = {};

  if (raw.player !== undefined) {
    if (!isPlainObject(raw.player)) {
      throw new ContractFormatError("scenario.player must be an object");
    }
    out.player = {};
    if (raw.player.pos !== undefined) {
      out.player.pos = assertVec3(raw.player.pos, "scenario.player.pos");
    }
    if (raw.player.carried !== undefined) {
      out.player.carried = assertNonNegInt(raw.player.carried, "scenario.player.carried");
    }
    if (raw.player.flames !== undefined) {
      out.player.flames = assertNonNegInt(raw.player.flames, "scenario.player.flames");
    }
    if (raw.player.successful_lights !== undefined) {
      out.player.successful_lights = assertNonNegInt(
        raw.player.successful_lights,
        "scenario.player.successful_lights"
      );
    }
    if (raw.player.invuln_ticks !== undefined) {
      out.player.invuln_ticks = assertNonNegInt(raw.player.invuln_ticks, "scenario.player.invuln_ticks");
    }
    if (raw.player.dash_cd_ticks !== undefined) {
      out.player.dash_cd_ticks = assertNonNegInt(raw.player.dash_cd_ticks, "scenario.player.dash_cd_ticks");
    }
    if (raw.player.pulse_cd_ticks !== undefined) {
      out.player.pulse_cd_ticks = assertNonNegInt(
        raw.player.pulse_cd_ticks,
        "scenario.player.pulse_cd_ticks"
      );
    }
    if (raw.player.charm_ticks !== undefined) {
      out.player.charm_ticks = assertNonNegInt(raw.player.charm_ticks, "scenario.player.charm_ticks");
    }
  }

  for (const flag of ["random_motes", "random_shades", "random_drifters", "wind_enabled"] as const) {
    if (raw[flag] !== undefined) {
      if (typeof raw[flag] !== "boolean") {
        throw new ContractFormatError(`scenario.${flag} must be a boolean`);
      }
      out[flag] = raw[flag];
    }
  }

  if (raw.motes !== undefined) {
    if (!Array.isArray(raw.motes)) {
      throw new ContractFormatError("scenario.motes must be an array");
    }
    const motes: ScenarioMoteOverride[] = [];
    for (let i = 0; i < raw.motes.length; i += 1) {
      const item = raw.motes[i];
      if (Array.isArray(item)) {
        motes.push(assertVec3(item, `scenario.motes[${i}]`));
      } else if (isPlainObject(item)) {
        if (item.id !== undefined && (typeof item.id !== "string" || item.id.length === 0)) {
          throw new ContractFormatError(`scenario.motes[${i}].id must be a non-empty string`);
        }
        if (item.kind !== undefined && item.kind !== "random" && item.kind !== "dropped") {
          throw new ContractFormatError(`scenario.motes[${i}].kind must be "random" or "dropped"`);
        }
        if (item.ttl_s !== undefined && item.ttl_s !== null) {
          assertNonNegNumber(item.ttl_s, `scenario.motes[${i}].ttl_s`);
        }
        motes.push({
          id: item.id as string | undefined,
          pos: assertVec3(item.pos, `scenario.motes[${i}].pos`),
          kind: item.kind as MoteKind | undefined,
          ttl_s: item.ttl_s as number | null | undefined,
        });
      } else {
        throw new ContractFormatError(`scenario.motes[${i}] must be [x, y, z] or { pos }`);
      }
    }
    out.motes = motes;
  }

  if (raw.shades !== undefined) {
    if (!Array.isArray(raw.shades)) {
      throw new ContractFormatError("scenario.shades must be an array");
    }
    const shades: ScenarioShadeOverride[] = [];
    for (let i = 0; i < raw.shades.length; i += 1) {
      const item = raw.shades[i];
      if (!isPlainObject(item)) {
        throw new ContractFormatError(`scenario.shades[${i}] must be an object`);
      }
      if (item.id !== undefined && (typeof item.id !== "string" || item.id.length === 0)) {
        throw new ContractFormatError(`scenario.shades[${i}].id must be a non-empty string`);
      }
      if (item.state !== undefined && !VALID_SHADE_STATES.has(item.state as ShadeBehaviorState)) {
        throw new ContractFormatError(`scenario.shades[${i}].state is invalid`);
      }
      if (item.state_ticks_left !== undefined) {
        assertNonNegInt(item.state_ticks_left, `scenario.shades[${i}].state_ticks_left`);
      }
      if (item.target_lantern_id !== undefined) {
        if (typeof item.target_lantern_id !== "string" || !validLanternIds.has(item.target_lantern_id)) {
          throw new ContractFormatError(`scenario.shades[${i}].target_lantern_id must be a valid lantern id`);
        }
      }
      shades.push({
        id: item.id as string | undefined,
        pos: assertVec3(item.pos, `scenario.shades[${i}].pos`),
        state: item.state as ShadeBehaviorState | undefined,
        state_ticks_left: item.state_ticks_left as number | undefined,
        target_lantern_id: item.target_lantern_id as string | undefined,
      });
    }
    out.shades = shades;
  }

  if (raw.drifters !== undefined) {
    if (!Array.isArray(raw.drifters)) {
      throw new ContractFormatError("scenario.drifters must be an array");
    }
    const drifters: ScenarioDrifterOverride[] = [];
    for (let i = 0; i < raw.drifters.length; i += 1) {
      const item = raw.drifters[i];
      if (!isPlainObject(item)) {
        throw new ContractFormatError(`scenario.drifters[${i}] must be an object`);
      }
      if (item.id !== undefined && (typeof item.id !== "string" || item.id.length === 0)) {
        throw new ContractFormatError(`scenario.drifters[${i}].id must be a non-empty string`);
      }
      if (item.state !== undefined && !VALID_DRIFTER_STATES.has(item.state as DrifterBehaviorState)) {
        throw new ContractFormatError(`scenario.drifters[${i}].state is invalid`);
      }
      if (item.stolen !== undefined) {
        assertNonNegInt(item.stolen, `scenario.drifters[${i}].stolen`);
      }
      drifters.push({
        id: item.id as string | undefined,
        pos: assertVec3(item.pos, `scenario.drifters[${i}].pos`),
        state: item.state as DrifterBehaviorState | undefined,
        stolen: item.stolen as number | undefined,
      });
    }
    out.drifters = drifters;
  }

  if (raw.charms !== undefined) {
    if (!Array.isArray(raw.charms)) {
      throw new ContractFormatError("scenario.charms must be an array");
    }
    const charms: ScenarioCharmOverride[] = [];
    for (let i = 0; i < raw.charms.length; i += 1) {
      const item = raw.charms[i];
      if (!isPlainObject(item)) {
        throw new ContractFormatError(`scenario.charms[${i}] must be an object`);
      }
      if (item.id !== undefined && (typeof item.id !== "string" || item.id.length === 0)) {
        throw new ContractFormatError(`scenario.charms[${i}].id must be a non-empty string`);
      }
      if (item.available !== undefined && typeof item.available !== "boolean") {
        throw new ContractFormatError(`scenario.charms[${i}].available must be a boolean`);
      }
      if (item.respawn_s !== undefined) {
        assertNonNegNumber(item.respawn_s, `scenario.charms[${i}].respawn_s`);
      }
      charms.push({
        id: item.id as string | undefined,
        pos: item.pos !== undefined ? assertVec3(item.pos, `scenario.charms[${i}].pos`) : undefined,
        available: item.available as boolean | undefined,
        respawn_s: item.respawn_s as number | undefined,
      });
    }
    out.charms = charms;
  }

  if (raw.lanterns !== undefined) {
    if (!Array.isArray(raw.lanterns)) {
      throw new ContractFormatError("scenario.lanterns must be an array");
    }
    const lanterns: ScenarioLanternOverride[] = [];
    for (let i = 0; i < raw.lanterns.length; i += 1) {
      const item = raw.lanterns[i];
      if (!isPlainObject(item) || typeof item.id !== "string" || !validLanternIds.has(item.id)) {
        throw new ContractFormatError(`scenario.lanterns[${i}].id must match a valid stage lantern id`);
      }
      const override: ScenarioLanternOverride = { id: item.id };
      if (item.pos !== undefined) {
        override.pos = assertVec3(item.pos, `scenario.lanterns[${i}].pos`);
      }
      if (item.deposited !== undefined) {
        override.deposited = assertNonNegInt(item.deposited, `scenario.lanterns[${i}].deposited`);
      }
      if (item.lit !== undefined) {
        if (typeof item.lit !== "boolean") {
          throw new ContractFormatError(`scenario.lanterns[${i}].lit must be a boolean`);
        }
        override.lit = item.lit;
      }
      if (item.fuel !== undefined) {
        override.fuel = assertNonNegNumber(item.fuel, `scenario.lanterns[${i}].fuel`);
      }
      if (item.ever_lit !== undefined) {
        if (typeof item.ever_lit !== "boolean") {
          throw new ContractFormatError(`scenario.lanterns[${i}].ever_lit must be a boolean`);
        }
        override.ever_lit = item.ever_lit;
      }
      lanterns.push(override);
    }
    out.lanterns = lanterns;
  }

  if (raw.time_left_s !== undefined) {
    out.time_left_s = assertNonNegNumber(raw.time_left_s, "scenario.time_left_s");
  }

  return out;
}
