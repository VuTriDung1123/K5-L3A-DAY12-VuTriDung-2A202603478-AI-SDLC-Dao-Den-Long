import type {
  FrameInput,
  InputsConfig,
  ScenarioConfig,
  ScenarioLanternOverride,
  ScenarioMoteOverride,
  ScenarioShadeOverride,
  Vec3,
} from "./types.js";

/** Thrown when scenario or inputs JSON violates Test Contract v1.0 schema. */
export class ContractFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractFormatError";
  }
}

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

/** Validates and parses an inputs JSON object according to Test Contract v1.0. */
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

    for (const key of ["jump", "interact", "pulse", "dash"] as const) {
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

/** Validates and parses a scenario JSON object according to Test Contract v1.0. */
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
  }

  if (raw.random_motes !== undefined) {
    if (typeof raw.random_motes !== "boolean") {
      throw new ContractFormatError("scenario.random_motes must be a boolean");
    }
    out.random_motes = raw.random_motes;
  }

  if (raw.random_shades !== undefined) {
    if (typeof raw.random_shades !== "boolean") {
      throw new ContractFormatError("scenario.random_shades must be a boolean");
    }
    out.random_shades = raw.random_shades;
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
        motes.push({
          id: item.id as string | undefined,
          pos: assertVec3(item.pos, `scenario.motes[${i}].pos`),
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
      if (item.state !== undefined && item.state !== "chase" && item.state !== "stunned") {
        throw new ContractFormatError(`scenario.shades[${i}].state must be "chase" or "stunned"`);
      }
      shades.push({
        id: item.id as string | undefined,
        pos: assertVec3(item.pos, `scenario.shades[${i}].pos`),
        state: item.state as "chase" | "stunned" | undefined,
      });
    }
    out.shades = shades;
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
      lanterns.push(override);
    }
    out.lanterns = lanterns;
  }

  if (raw.time_left_s !== undefined) {
    out.time_left_s = assertNonNegNumber(raw.time_left_s, "scenario.time_left_s");
  }

  return out;
}
