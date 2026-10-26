import type { QuirePoint } from "@quirekit/renderer";
import type { QuireHitTarget } from "../../../../layout";
import type { QuireLayoutSnapshot } from "../../../../editor-layout";
import type { QuireHitTestResult } from "../../../types";
import type {
  QuireViewLayerHitCandidate,
  QuireViewLayerTargetIndexQueryDiagnostics,
  QuireViewLayerTargetDecision
} from "../../../../view-graph";

/** Private identity lookup derived from one published immutable snapshot. */
export interface QuireLayoutLayerTargetMap {
  /** Exact retained target array used to derive the lookup. */
  readonly targets: readonly QuireHitTarget[];
  /** Target lookup with the original last-entry precedence for duplicate ids. */
  readonly byId: ReadonlyMap<string, QuireHitTarget>;
}

/** Options used to resolve retained layer targets at one point. */
export interface QuireLayoutLayerTargetHitOptions {
  /** Layout snapshot whose retained targets should be tested. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point to test against retained targets. */
  readonly point: QuirePoint;
}

/** Layer hit-test result plus the retained diagnostic chains it observed. */
export interface QuireLayoutLayerTargetHitResult {
  /** Consuming hit produced by a retained target, or null when all targets passed through. */
  readonly hit: QuireHitTestResult | null;
  /** Sorted retained layer candidates containing the queried point. */
  readonly layerHitChain: readonly QuireViewLayerHitCandidate[];
  /** Diagnostics for the coarse retained layer target source query. */
  readonly layerTargetIndexQuery: QuireViewLayerTargetIndexQueryDiagnostics;
  /** Policy decisions made while evaluating the retained target chain. */
  readonly targetChain: readonly QuireViewLayerTargetDecision[];
}

/** Retained layer candidates plus diagnostics from their coarse source query. */
export interface QuireLayoutLayerTargetCandidateCollection {
  /** Exact retained candidates containing the queried point. */
  readonly candidates: readonly QuireLayoutLayerTargetCandidate[];
  /** Diagnostics for the coarse retained layer target source query. */
  readonly layerTargetIndexQuery: QuireViewLayerTargetIndexQueryDiagnostics;
}

/** Retained hit target sources plus diagnostics from their coarse query path. */
export interface QuireLayoutLayerTargetCandidateSources {
  /** Retained layout targets selected for exact point inspection. */
  readonly targets: readonly QuireHitTarget[];
  /** Diagnostics for the coarse retained layer target source query. */
  readonly layerTargetIndexQuery: QuireViewLayerTargetIndexQueryDiagnostics;
}

/** Retained layer candidate with its owning layout target. */
export interface QuireLayoutLayerTargetCandidate
  extends QuireViewLayerHitCandidate {
  /** Layout hit target that produced the candidate. */
  readonly target: QuireHitTarget;
}
