import type { MindMapDocument } from "@quirekit/mind-map";
import type { MindMapEditor, SimpleMindMapOptions } from "@quirekit/mind-map-simple";

/** Browser regression harness using only package exports. */
export interface MindMapHarness {
  /** Live test instances. */
  editors: MindMapEditor[];
  /** Data invalidations per instance. */
  notifications: number[];
  /** Event and vendor errors reported by the adapter. */
  errors: string[];
  /** Test-only public vendor event trace, never exposed by the package. */
  trace: {
    /** Starts a fresh bounded interaction sample. */
    start(): void;
    /** @returns Events and explicit full-source reads since the sample began. */
    read(): { events: MindMapTraceEvent[]; sourceReads: number; historyReads: number; selectionUpdates: number; selectionCounts: number[] };
    /** Stops sampling. */
    stop(): void;
  };
  /** @param count - Exact tree size. @returns Deterministic canonical fixture. */
  document(count: number): MindMapDocument;
  /** @param count - Tree size. @param host - Container id. @param options - Overrides. @returns Instance index. */
  mount(count?: number, host?: string, options?: Partial<SimpleMindMapOptions>): Promise<number>;
}

/** Public vendor event timestamp used by input performance regressions. */
export interface MindMapTraceEvent {
  /** Input, render start or render end event name. */
  name: string;
  /** Monotonic browser timestamp in milliseconds. */
  time: number;
}

declare global {
  /** Browser fixture controls, separate from the public editor API. */
  interface Window {
    /** Initialized fixture API. */
    mindMapHarness: MindMapHarness;
    /** Set before navigation by automated tests that mount their own instances. */
    mindMapHarnessOnly?: boolean;
  }
}
