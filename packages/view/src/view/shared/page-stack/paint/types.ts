/** Action required to synchronize one mounted page surface. */
export type QuirePageSurfacePaintValidityAction = "reuse" | "refresh";

/** Result of comparing one mounted page surface with a requested paint signature. */
export interface QuirePageSurfacePaintValidityDecision {
  /** Whether the current surface can be reused or must be refreshed. */
  readonly action: QuirePageSurfacePaintValidityAction;
  /** Exact backend-owned signature compared for this surface. */
  readonly signature: string;
}

/** Diagnostics for one mounted page-surface validity resource. */
export interface QuirePageSurfacePaintValiditySnapshot {
  /** Lookups that reused an explicitly committed signature. */
  readonly hits: number;
  /** Lookups that required a surface refresh. */
  readonly misses: number;
  /** Successful surface refreshes committed by the backend. */
  readonly stores: number;
}
