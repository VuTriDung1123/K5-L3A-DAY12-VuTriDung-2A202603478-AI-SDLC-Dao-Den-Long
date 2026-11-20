import { GameSimulation } from "./simulation.js";
import type {
  ActiveInputState,
  FrameInput,
  InputsConfig,
  JsonlEnd,
  JsonlLine,
  NightNumber,
  ScenarioConfig,
} from "./types.js";

export interface HeadlessSessionOptions {
  seed: number;
  night: NightNumber;
  scenario?: ScenarioConfig;
  inputs?: InputsConfig;
  ticks: number;
  snapshotEvery?: number;
}

export interface HeadlessSessionResult {
  lines: JsonlLine[];
  end: JsonlEnd;
}

/** Runs a complete deterministic headless session according to Test Contract v1.1. */
export function runHeadlessSession(options: HeadlessSessionOptions): HeadlessSessionResult {
  const snapshotEvery = options.snapshotEvery ?? 10;
  const frames = options.inputs?.frames ?? [];
  const sim = new GameSimulation({
    seed: options.seed,
    night: options.night,
    scenario: options.scenario,
  });

  const activeInput: ActiveInputState = {
    move: [0, 0],
    cam_yaw_deg: 0,
    jump: false,
    interact: false,
    pulse: false,
    dash: false,
    pause: false,
  };

  let frameCursor = 0;
  const lines: JsonlLine[] = [sim.toSnapshot(0)];

  let executedTicks = 0;
  for (let k = 0; k < options.ticks; k += 1) {
    if (sim.isFinished()) {
      break;
    }

    while (frameCursor < frames.length && frames[frameCursor].tick < k) {
      applyFrame(activeInput, frames[frameCursor]);
      frameCursor += 1;
    }
    if (frameCursor < frames.length && frames[frameCursor].tick === k) {
      applyFrame(activeInput, frames[frameCursor]);
      frameCursor += 1;
    }

    const events = sim.step(activeInput);
    executedTicks = k + 1;

    for (const ev of events) {
      lines.push(ev);
    }

    if (executedTicks % snapshotEvery === 0) {
      lines.push(sim.toSnapshot(executedTicks));
    }

    if (sim.isFinished()) {
      break;
    }
  }

  const end: JsonlEnd = {
    type: "end",
    ticks: executedTicks,
    state: sim.state,
    score: sim.score,
  };
  lines.push(end);

  return { lines, end };
}

function applyFrame(target: ActiveInputState, frame: FrameInput): void {
  if (frame.move !== undefined) {
    target.move = [frame.move[0], frame.move[1]];
  }
  if (frame.cam_yaw_deg !== undefined) {
    target.cam_yaw_deg = frame.cam_yaw_deg;
  }
  if (frame.jump !== undefined) {
    target.jump = frame.jump;
  }
  if (frame.interact !== undefined) {
    target.interact = frame.interact;
  }
  if (frame.pulse !== undefined) {
    target.pulse = frame.pulse;
  }
  if (frame.dash !== undefined) {
    target.dash = frame.dash;
  }
  if (frame.pause !== undefined) {
    target.pause = frame.pause;
  }
}
