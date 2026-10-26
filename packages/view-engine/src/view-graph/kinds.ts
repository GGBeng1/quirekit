import type {
  QuireViewGraphInvalidationScopeKind,
  QuireViewGraphPerformanceInvariantKind
} from "./types";

export const quireViewGraphRequiredPerformanceInvariants = [
  "versioned-snapshots",
  "typed-invalidation",
  "layout-paint-dirty-split",
  "viewport-indexed-queries",
  "retained-display-chunks",
  "no-per-pointer-layout",
  "no-display-list-geometry-reconstruction",
  "speculative-composition-layout",
  "batched-browser-measurement",
  "stable-target-identities",
  "versioned-cancelable-async-jobs"
] as const satisfies readonly QuireViewGraphPerformanceInvariantKind[];

export const quireViewGraphRequiredInvalidationScopeKinds = [
  "root",
  "region",
  "visual-instance",
  "page",
  "viewport",
  "display-chunk",
  "selection-overlay",
  "composition-overlay"
] as const satisfies readonly QuireViewGraphInvalidationScopeKind[];
