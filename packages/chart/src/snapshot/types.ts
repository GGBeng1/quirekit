import type { ChartSpec } from "../model/types";

/** Explicit render inputs beyond the persisted chart model. */
export interface ChartSnapshotRequest {
  /** Actual local CSS width. */
  readonly width: number;
  /** Actual local CSS height. */
  readonly height: number;
  /** Raster pixels per CSS pixel. */
  readonly density: number;
  /** Resolved CSS font family, supplied by the document host. */
  readonly fontFamily: string;
  /** Font identity/version participating in snapshot invalidation. */
  readonly fontRevision: string;
  /** Explicit cancellation boundary. */
  readonly signal: AbortSignal;
}

/** Prepared immutable PNG shared by retained presentation and fixed exports. */
export interface ChartSnapshot {
  /** Canonical input signature; derived SVG identifiers are not authority. */
  readonly signature: string;
  /** Exact model revision rendered. */
  readonly revision: number;
  /** Portable PNG bytes; no browser Image or live instance. */
  readonly bytes: Uint8Array;
  /** Strict transient PNG data URL for existing image resource pipelines. */
  readonly dataUrl: string;
  /** Intrinsic raster width. */
  readonly width: number;
  /** Intrinsic raster height. */
  readonly height: number;
}

/** Replaceable snapshot renderer installed by a product consumer. */
export interface ChartSnapshotAdapter {
  /** Adapter version participates in cache signatures. */
  readonly version: string;
  /** Prepares one immutable input, with explicit asynchronous cancellation. */
  render(spec: ChartSpec, request: ChartSnapshotRequest): Promise<ChartSnapshot>;
}
