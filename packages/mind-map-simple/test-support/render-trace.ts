import MindMap from "simple-mind-map";
import type { MindMapHarness, MindMapTraceEvent } from "./types";

const events: MindMapTraceEvent[] = [];
let recording = false;
let sourceReads = 0;
let historyReads = 0, selectionUpdates = 0;
const selectionCounts: number[] = [];
const prototype = MindMap.prototype;
const originalEmit = prototype.emit;
const originalGetData = prototype.getData;

// Instrument public vendor events only in regression fixtures; the adapter's
// production surface never leaks its vendor instance or installs this trace.
/** @param name - Public vendor event. @param args - Unmodified event arguments. */
prototype.emit = function (name: string, ...args: unknown[]): void {
  if (recording && name === "beforeAddHistory") historyReads++;
  if (recording && name === "node_active") {
    selectionUpdates++;
    selectionCounts.push((args[1] as unknown[]).length);
  }
  if (recording && ["node_text_edit_change", "node_tree_render_start", "node_tree_render_end"].includes(name)) {
    events.push({ name, time: performance.now() });
  }
  originalEmit.call(this, name, ...args);
};
/** @param args - Unmodified vendor read arguments. @returns Original source result. */
prototype.getData = function (...args: unknown[]): unknown {
  if (recording) sourceReads++;
  return originalGetData.apply(this, args);
};

export const renderTrace: MindMapHarness["trace"] = {
  /** Starts a fresh sample after mount and edit activation have settled. */
  start() { events.length = 0; selectionCounts.length = 0; sourceReads = 0; historyReads = 0; selectionUpdates = 0; recording = true; },
  /** @returns A detached trace for assertions and the baseline artifact. */
  read() { return { events: [...events], sourceReads, historyReads, selectionUpdates, selectionCounts: [...selectionCounts] }; },
  /** Stops recording without clearing the last sample. */
  stop() { recording = false; },
};
