import type { FlowchartDocument } from "../model/types";
/** Atomic host commit outcome. */
export type FlowchartCommitResult = "saved" | "conflict" | "readonly" | "missing";
/** Complete replacement with compare-and-swap preconditions. */
export interface FlowchartCommitRequest {
  /** Stable host object identity. */ readonly targetId: string;
  /** Host revision captured on open. */ readonly expectedRevision: number;
  /** Validated replacement with revision incremented once. */ readonly document: FlowchartDocument;
}
/** @param request - Preconditions and replacement. @returns Synchronous atomic host outcome. */
export type FlowchartCommit = (request: FlowchartCommitRequest) => FlowchartCommitResult;
/** Isolated, single-use authoring session. */
export interface FlowchartDraft {
  /** @returns Current immutable graph. */ getDocument(): FlowchartDocument;
  /** @param document - Replacement retaining the original revision. */ replace(document: FlowchartDocument): void;
  /** @param commit - Atomic host transaction. @returns Outcome; only success closes the draft. */ save(commit: FlowchartCommit): FlowchartCommitResult;
  /** Discards the session without touching its host. */ cancel(): void;
}
