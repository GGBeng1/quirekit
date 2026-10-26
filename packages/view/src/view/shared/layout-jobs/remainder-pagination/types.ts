import type {
  QuireMeasuredContainer,
  QuirePageFragment,
  QuirePageGeometry,
  QuirePaginationCheckpointStore
} from "@quirekit/layout/pagination";

/** Clone-safe remainder pagination request payload. */
export interface QuireRemainderPaginationJobPayload {
  /** Request-local attachment identity. */
  readonly requestKey: string;
  /** Fully measured renderer-neutral document flow. */
  readonly container: QuireMeasuredContainer;
  /** Page geometry consumed by the canonical page driver. */
  readonly pageGeometry: QuirePageGeometry;
  /** Minimum lines retained at a page top. */
  readonly widows?: number | undefined;
  /** Minimum lines retained at a page bottom. */
  readonly orphans?: number | undefined;
  /** Exact geometry and policy identity compiled by the main thread. */
  readonly geometryKey: string;
}

/** Renderer-neutral output from pure remainder page driving. */
export interface QuireRemainderPaginationJobOutput {
  /** Echoed request-local attachment identity. */
  readonly requestKey: string;
  /** Echoed geometry and policy identity. */
  readonly geometryKey: string;
  /** Complete page stream for the measured container. */
  readonly fragments: readonly QuirePageFragment[];
}

/** Main-thread compilation options for one pagination job batch. */
export interface CompileQuireRemainderPaginationBatchOptions {
  /** Unique request-local attachment identity. */
  readonly requestKey: string;
  /** Fully measured renderer-neutral document flow. */
  readonly container: QuireMeasuredContainer;
  /** Page geometry consumed by canonical page driving. */
  readonly pageGeometry: QuirePageGeometry;
  /** Minimum lines retained at a page top. */
  readonly widows?: number | undefined;
  /** Minimum lines retained at a page bottom. */
  readonly orphans?: number | undefined;
  /** Checkpoint authority that scopes accepted prepared results. */
  readonly paginationCheckpointStore: QuirePaginationCheckpointStore;
}

/** Accepted-output attachment diagnostics. */
export interface QuireRemainderPaginationAttachmentDiagnostics {
  /** Number of complete page fragments attached. */
  readonly attachedPageCount: number;
}

/** Compiled payload plus its main-thread attachment authority. */
export interface QuireCompiledRemainderPaginationBatch {
  /** Clone-safe payload submitted through layout job authority. */
  readonly payload: QuireRemainderPaginationJobPayload;
  /**
   * Validates and attaches one accepted unknown output.
   *
   * @param output - Fresh output accepted by the coordinator.
   * @returns Attached page count.
   */
  readonly attachAcceptedOutput: (
    output: unknown
  ) => QuireRemainderPaginationAttachmentDiagnostics;
}
