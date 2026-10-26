import type { QuireDisplayListTraceSink } from "../types";

/** Mutable aggregate timings for one display-list content build. */
export interface QuireTextCommandTraceStats {
  /** Trace sink that receives aggregate text-command phases. */
  readonly trace: QuireDisplayListTraceSink;
  /** Synthetic start timestamp used to keep aggregate phases inside content. */
  readonly startedAt: number;
  /** Time spent finding transient text-style spans. */
  textStyleDurationMs: number;
  /** Time spent reading text-fragment command cache entries. */
  cacheLookupDurationMs: number;
  /** Time spent appending cached command arrays to the display list. */
  cacheReuseDurationMs: number;
  /** Time spent building commands for cache misses and preview fragments. */
  commandBuildDurationMs: number;
  /** Time spent slicing and storing freshly built command arrays. */
  cacheStoreDurationMs: number;
}
