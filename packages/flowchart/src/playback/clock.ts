import type { FlowchartPlaybackClock } from "./types";

/** @param clock - Embedding clock. @param advance - Next semantic boundary. @returns A single timer retaining logical time across pause and rate changes. */
export function createPlaybackTimer(clock: FlowchartPlaybackClock, advance: () => void) {
  let stop: (() => void) | undefined, started = 0, remaining = 0, total = 0, rate = 1, generation = 0;
  /** Captures elapsed logical time before releasing a scheduled completion. */
  function pause(): void {
    if (!stop) return;
    remaining = Math.max(0, remaining - (clock.now() - started) * rate); generation++; stop(); stop = undefined;
  }
  /** Schedules only the current remainder, with a ticket rejecting late completion. */
  function run(): void {
    pause(); const ticket = ++generation; started = clock.now();
    stop = clock.after(remaining / rate, () => {
      if (ticket !== generation) return;
      stop = undefined; remaining = 0; advance();
    });
  }
  return { pause, run,
    /** @param duration - Fresh event dwell. */ reset(duration: number): void { pause(); total = remaining = duration; },
    /** @param value - Explicit normalized step position. */ seek(value: number): void { pause(); remaining = total * (1 - value); },
    /** @returns Actual logical position, including unsampled running time. */ progress(): number { return total ? Math.min(1, Math.max(0, 1 - (remaining - (stop ? (clock.now() - started) * rate : 0)) / total)) : 0; },
    /** @param value - Valid playback multiplier. */ setRate(value: number): void { const running = !!stop; pause(); rate = value; if (running) run(); },
    /** @returns Whether the displayed event still owns a dwell. */ hasRemaining: () => remaining > 0,
  };
}
