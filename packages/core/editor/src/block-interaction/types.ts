import type { Node as PMNode } from "@quirekit/pm";

/** Exact block fragment projected by a mounted renderer. */
export interface QuireMountedBlockFragment {
  /** Immutable source document, used to reject stale geometry. */
  readonly sourceDocument: PMNode;
  /** Complete source block start. */
  readonly from: number;
  /** Complete source block end. */
  readonly to: number;
  /** Retained occurrence identity. */
  readonly occurrenceId: string;
  /** Geometry version. */
  readonly geometryVersion: number;
  /** Whether this occurrence exposes the logical before boundary. */
  readonly first: boolean;
  /** Whether this occurrence exposes the logical after boundary. */
  readonly last: boolean;
  /** Client-space rectangle. */
  readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
  /** Document-space rectangle, never mixed with CSS-pixel thresholds. */
  readonly documentRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
}

/** Pointer continuation owned by the mounted editor rather than a product SFC. */
export interface QuireBlockPointerLease {
  /** Selection gestures may run in read mode; this never grants document mutation permission. */
  readonly selectionOnly?: boolean;
  /** Latest coalesced sample: true scrolls, false stays armed, null cancels ownership. */
  readonly update: (point: { readonly clientX: number; readonly clientY: number }) => boolean | null;
  /** Final sample has already been synchronously applied. */
  readonly finish: () => void;
  /** Clears feature preview when pointer or view ownership ends. */
  readonly cancel: () => void;
}
