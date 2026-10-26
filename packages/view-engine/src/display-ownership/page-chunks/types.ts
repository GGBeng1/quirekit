import type { QuireDisplayList, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutPage } from "../../layout";
import type {
  QuireRetainedDisplayOwnerChunkIndex,
  QuireRetainedDisplayOwnerIndex
} from "../types";

/** Display chunk scope owned by retained layout records. */
export type QuireRetainedDisplayChunkKind = "page-local" | "sub-layout-local";

/** Minimal retained layout record that can own a display-list chunk. */
export interface QuireRetainedDisplayChunkRecord {
  /** Stable record key within one frame. */
  readonly key: string;
  /** Spatial scope represented by this chunk record. */
  readonly kind: QuireRetainedDisplayChunkKind;
  /** Document-space rectangle that owns the chunk. */
  readonly rect: QuireRect;
  /** Optional root display command id that must own commands for this chunk. */
  readonly paintRootCommandId?: string | undefined;
}

/** Retained chunk counters for one ownership category. */
export interface QuireDisplayChunkCategoryCounters {
  /** Number of retained layout records considered for chunk production. */
  readonly retainedRecords: number;
  /** Number of retained display chunks emitted by the online producer. */
  readonly retainedChunks: number;
  /** Number of whole-display-list fallback scans used for this frame. */
  readonly fullFallbacks: number;
}

/** Frame counters that expose display chunk production paths. */
export interface QuireViewDisplayChunkCounters {
  /** Page-local chunk production counters. */
  readonly page: QuireDisplayChunkCategoryCounters;
  /** Sub-layout-local chunk production counters. */
  readonly subLayout: QuireDisplayChunkCategoryCounters;
}

/** Retained layout-page record that owns one page-local display chunk. */
export interface QuirePageStackDisplayListChunkRecord
  extends QuireRetainedDisplayChunkRecord {
  /** Page-stack records are always page-local retained layout records. */
  readonly kind: "page-local";
  /** Zero-based page index this retained record paints. */
  readonly pageIndex: number;
  /** Page rectangle in document space. */
  readonly pageRect: QuireRect;
}

/** Page-local content and overlay lists derived from one engine frame. */
export interface QuirePageStackDisplayListChunk {
  /** Retained page layout record that owns this chunk. */
  readonly retainedRecord: QuirePageStackDisplayListChunkRecord;
  /** Canonical direct display owners realized into this page chunk. */
  readonly sourceOwnerKeys: readonly string[];
  /** Zero-based page index this chunk paints. */
  readonly pageIndex: number;
  /** Page rectangle in document space. */
  readonly pageRect: QuireRect;
  /** Page-clipped paint bounds for persistent content commands, or null when empty. */
  readonly contentDirtyBounds: QuireRect | null;
  /** Page-clipped paint bounds for transient overlay commands, or null when empty. */
  readonly overlayDirtyBounds: QuireRect | null;
  /** Content display list already scoped to the page rectangle. */
  readonly contentDisplayList: QuireDisplayList;
  /** Overlay display list already scoped to the page rectangle. */
  readonly overlayDisplayList: QuireDisplayList;
}

/** Sparse index of renderer-neutral page-local display-list chunks. */
export interface QuirePageStackDisplayListChunkIndex {
  /** Page-local chunks sorted by page index. */
  readonly chunks: readonly QuirePageStackDisplayListChunk[];
  /** Page-local chunks keyed by zero-based page index. */
  readonly chunksByPageIndex: Readonly<Record<number, QuirePageStackDisplayListChunk>>;
}

/** Inputs for realizing page-local lists from canonical retained owner chunks. */
export interface RealizeQuirePageStackDisplayOwnerChunksOptions {
  /** Layout pages that may need page-local display lists. */
  readonly pages: readonly QuireLayoutPage[];
  /** Canonical owner graph supplying explicit page membership. */
  readonly ownerIndex: QuireRetainedDisplayOwnerIndex;
  /** Direct content and overlay command chunks keyed by retained owner. */
  readonly ownerChunks: QuireRetainedDisplayOwnerChunkIndex;
  /** Document-space bounds shared by the realized page display lists. */
  readonly bounds: QuireRect;
  /** Optional document-space clips limiting which pages need realization. */
  readonly clipRects?: readonly QuireRect[] | undefined;
}
