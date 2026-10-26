/** Work observed in a real, isolated gesture interval. */
export interface FlowWorkSample {
  /** Public full-source reads. */ sourceReads: number;
  /** Full native-source JSON serialization. */ serializations: number;
  /** Public full-text search calls. */ searches: number;
  /** Painted main-path mutations by stable edge ID. */ paths: Record<string, number>;
  /** Incrementally updated overview entities. */ overview: string[];
}
/** Test-only observation lifetime; never installed by the product. */
export interface FlowWorkProbe {
  /** @param reset - Starts a fresh interval after this read. @returns Work including pending DOM records. */ sample(reset?: boolean): FlowWorkSample;
  /** Restores decorated methods and releases DOM observation. */ restore(): void;
}
declare global {
  interface Window {
    /** Isolated acceptance instrumentation, removed after each sample. */ flowWorkProbe?: FlowWorkProbe;
  }
}
