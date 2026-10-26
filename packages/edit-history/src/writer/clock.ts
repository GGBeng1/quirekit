import type { WriterClock } from "./types";

/** Wall clock with platform timers. */
export const systemClock: WriterClock = {
  now: () => Date.now(),
  schedule(run, ms) { const timer = setTimeout(run, ms); return () => clearTimeout(timer); },
};
