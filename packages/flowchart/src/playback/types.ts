import type { FlowchartMotionEffect, FlowchartMotionPatch } from "./motion/types";
import type { FlowchartDocument } from "../model/types";

/** Transient algorithm state, independent of authored shape and connector styles. */
export type FlowchartRunState = "pending" | "running" | "completed" | "reused" | "invalid";
/** One exact target update; nodes and edges share the same ID space. */
export interface FlowchartRunChange {
  /** Existing node or connector identity. */ readonly id: string;
  /** State retained until another step changes this target. */ readonly state: FlowchartRunState;
}
/** A semantic event and its explanatory dwell time, never a document mutation. */
export interface FlowchartPlaybackStep {
  /** Accepted transient diagram; shared IDs retain identity. Never edits the authored document. */ readonly scene?: FlowchartDocument;
  /** Scene transition in logical milliseconds within this step; defaults to the step duration. */ readonly sceneDuration?: number;
  /** Optional data-motion choreography within this event's duration. */ readonly effects?: readonly FlowchartMotionEffect[];
  /** Unique event identity within this run. */ readonly id: string;
  /** Plain-text explanation heading. */ readonly title: string;
  /** Optional plain-text details supplied by the algorithm host. */ readonly description?: string;
  /** Logical dwell in milliseconds, 100–60000; defaults to 1200. */ readonly duration?: number;
  /** Exact target updates, including running connectors for the active branch. */ readonly changes: readonly FlowchartRunChange[];
}
/** Host-owned, portable teaching sequence; not part of FlowchartDocument. */
export interface FlowchartPlaybackTrace {
  /** Default status projection, or choreography without selection-like decoration. */ readonly presentation?: "status" | "motion";
  /** Source objects initially hidden only during this run; appear effects reveal them. */ readonly hidden?: readonly string[];
  /** Plain-text run name. */ readonly title: string;
  /** Ordered semantic steps, allowing repeated visits to the same target. */ readonly steps: readonly FlowchartPlaybackStep[];
}
/** Small semantic projection; animation frames do not publish this state. */
export interface FlowchartPlaybackState {
  /** Current run's presentation mode, without copying its choreography log. */ readonly presentation: "status" | "motion";
  /** Instance-local run generation, allowing UI to reuse recorded steps until the run changes. */ readonly runId: number;
  /** Whether a run currently owns transient presentation. */ readonly active: boolean;
  /** Preset teaching sequence or a live, explicitly finished event feed. */ readonly mode: "preset" | "live" | null;
  /** Ready, advancing, manually paused, waiting for input, or finished. */ readonly status: "idle" | "ready" | "playing" | "paused" | "waiting" | "completed";
  /** Current run name, empty outside a run. */ readonly title: string;
  /** Number of steps already applied; zero precedes the first step. */ readonly index: number;
  /** Number of events currently recorded. */ readonly count: number;
  /** Currently displayed event; null before the first step. */ readonly current: FlowchartPlaybackStep | null;
  /** Playback multiplier in the inclusive range 0.25–4. */ readonly rate: number;
  /** Continuous flow motion is suppressed while semantic steps remain usable. */ readonly reducedMotion: boolean;
}
/** Sparse presentation invalidation; a reset also clears all previously shown targets. */
export interface FlowchartPlaybackPatch {
  /** New accepted presentation diagram; null restores the authored diagram, absence retains it. */ readonly scene?: FlowchartDocument | null;
  /** Scene before the current event, retained for deterministic within-step previews. */ readonly sceneFrom?: FlowchartDocument;
  /** Scene transition length; prefix resets always show the completed pose. */ readonly sceneDuration?: number;
  /** Current-step choreography and cumulative visibility, when configured. */ readonly motion?: FlowchartMotionPatch;
  /** Clear previous run overlays before applying these changes. */ readonly reset: boolean;
  /** Only targets whose retained state must be presented. */ readonly changes: readonly FlowchartRunChange[];
}
/** Injectable logical clock, usable without a browser or vendor graph. */
export interface FlowchartPlaybackClock {
  /** @returns Monotonic milliseconds. */ now(): number;
  /** @param milliseconds - Real delay. @param callback - Single completion. @returns Idempotent cancellation. */
  after(milliseconds: number, callback: () => void): () => void;
}
/** One isolated player and its renderer-neutral presentation port. */
export interface FlowchartPlaybackOptions {
  /** @param id - Exact identity. @param kind - Travel requires an edge. @returns Whether this run can address the typed target. */ readonly hasTarget: (id: string, kind?: "edge") => boolean;
  /** @param patch - Sparse state changes. Never writes authored graph data. */ readonly onPatch?: (patch: FlowchartPlaybackPatch) => void;
  /** Guard after validation, before replacing an existing run. */ readonly beforeEnter?: () => void;
  /** Explicit platform clock; the headless player does not access browser or Node timers. */ readonly clock: FlowchartPlaybackClock;
}
/** An event sink bound to exactly one live run and editor lifetime. */
export interface FlowchartPlaybackFeed {
  /** @param step - Valid, unique semantic event. @returns False for a retired run; invalid/over-budget input throws without appending. */ append(step: FlowchartPlaybackStep): boolean;
  /** @returns False for a retired run; otherwise marks event production complete. */ finish(): boolean;
}
/** Independent playback controls, shared by adapters and algorithm consumers. */
export interface FlowchartPlayback {
  /** @returns Current logical step progress in [0,1], without source reads or frame notifications. */ getProgress(): number;
  /** @param progress - Current-step position in [0,1]; pauses while preserving the semantic prefix. */ seekProgress(progress: number): void;
  /** @param trace - Valid preset; starts ready without automatic playback. */ load(trace: FlowchartPlaybackTrace): void;
  /** @param title - Run heading. @returns Sink bound to this run; playback waits for its first event. */ beginLive(title: string): FlowchartPlaybackFeed;
  /** Continues the remaining dwell, or starts/restarts the sequence. */ play(): void;
  /** Retains the current event and remaining logical time. */ pause(): void;
  /** Applies exactly one subsequent event and pauses. */ step(): void;
  /** @param index - Number of events to apply, 0–count; restores cumulative target states. */ seek(index: number): void;
  /** Clears cumulative states and plays the recorded sequence from the start. */ replay(): void;
  /** @param rate - Finite multiplier 0.25–4, preserving current logical progress. */ setRate(rate: number): void;
  /** @param reduced - Whether continuous flow motion should be suppressed. */ setReducedMotion(reduced: boolean): void;
  /** @returns Immutable semantic projection without copying the event log or graph. */ getState(): FlowchartPlaybackState;
  /** @returns Detached immutable trace, copied only at this explicit read boundary. */ getTrace(): FlowchartPlaybackTrace;
  /** @param id - Node or connector identity. @returns Cumulative state, or undefined when the target has not been addressed. */ getTargetState(id: string): FlowchartRunState | undefined;
  /** @param listener - Semantic boundary observer, called immediately. @returns Idempotent removal. */ subscribe(listener: (state: FlowchartPlaybackState) => void): () => void;
  /** Ends the run, clears its presentation and retires the feed. */ close(): void;
  /** Releases timers, listeners and presentation; repeated calls are harmless. */ destroy(): void;
}
