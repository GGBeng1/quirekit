import type {
  CanvasGlyphRunPainter,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import type { CanvasPageStackFrame } from "../frames";
import type { CanvasPageContentCacheDiagnostics } from "../../types";

/** Action required to synchronize one mounted page content surface. */
export type CanvasPageStackContentPaintAction = "skip" | "restore" | "paint";

/** Options controlling retained page content bitmap memory. */
export interface CanvasPageStackContentPaintCacheOptions {
  /** Maximum Canvas bitmap backing-store bytes retained by the cache. */
  readonly maxBitmapBytes?: number | undefined;
}

/** Counters exposed by the page-stack content paint cache. */
export type CanvasPageStackContentPaintCacheSnapshot = CanvasPageContentCacheDiagnostics;

/** Last cache-managed content version that may be captured when a surface retires. */
export interface CanvasPageContentRetirementCandidate {
  /** Registered content version painted into the surface. */
  readonly contentVersion: number;
  /** Surface-local clear epoch observed by the accepted paint. */
  readonly surfaceEpoch: string;
  /** Cache-local invalidation epoch observed by the accepted paint. */
  readonly surfaceValidityEpoch: number;
  /** Backing-store width owned by the accepted paint. */
  readonly width: number;
  /** Backing-store height owned by the accepted paint. */
  readonly height: number;
}

/** Inputs used to synchronize one page content surface. */
export interface CanvasPageStackContentPaintRequest {
  /** Mounted page frame whose content canvas may be reused. */
  readonly frame: CanvasPageStackFrame;
  /** Canonical retained page-chunk identity owning the content. */
  readonly chunkKey: string;
  /** Canonical direct display owners realized into the page chunk. */
  readonly sourceOwnerKeys: readonly string[];
  /** Document-space content display list to summarize for the page. */
  readonly displayList: QuireDisplayList;
  /** Page rectangle used to scope the content display list. */
  readonly viewportRect: QuireRect;
  /** Whether `displayList` is already filtered to `viewportRect`. */
  readonly displayListIsViewportScoped?: boolean | undefined;
  /** Device pixel ratio used by the page canvas backing store. */
  readonly devicePixelRatio: number;
  /** Optional glyph-run painter that may change content paint output. */
  readonly glyphRunPainter?: CanvasGlyphRunPainter | undefined;
}

/** Result of one page content cache lookup. */
export interface CanvasPageStackContentPaintDecision {
  /** Synchronization action required for the mounted content surface. */
  readonly action: CanvasPageStackContentPaintAction;
  /** Registered content version shared across equivalent page surfaces. */
  readonly contentVersion: number;
  /** Surface-local clear epoch observed while resolving the decision. */
  readonly surfaceEpoch: string;
  /** Cache-local invalidation epoch observed while resolving the decision. */
  readonly surfaceValidityEpoch: number;
}

/** Inputs compared to resolve one page content version. */
export interface CanvasPageContentVersionParts {
  /** Scalar dependencies serialized into one short string. */
  readonly scalars: string;
  /** Source owner keys in page order. */
  readonly ownerKeys: readonly string[];
  /** Number of command signatures. */
  readonly commandCount: number;
  /**
   * Reads one command's serialized paint signature; unchanged commands return the same string.
   * @param index - Command position in paint order.
   * @returns Serialized signature.
   */
  readonly readCommand: (index: number) => string;
  /**
   * Reads the cached hash of one command's serialized signature.
   * @param index - Command position in paint order.
   * @returns 32-bit hash.
   */
  readonly readCommandHash: (index: number) => number;
}
