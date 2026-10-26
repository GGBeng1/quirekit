import type {
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireLayoutPage,
  QuirePageStackDisplayListChunkIndex
} from "@quirekit/view-engine";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";

export type {
  QuirePageStackDisplayListChunk,
  QuirePageStackDisplayListChunkIndex,
  QuirePageStackDisplayListChunkRecord,
  RealizeQuirePageStackDisplayOwnerChunksOptions
} from "@quirekit/view-engine";

/** Display-list layer owned by page-stack chunks. */
export type QuirePageStackDisplayListLayer = "content" | "overlay";

/** Inputs for bounding a focused page-stack edit to a top-level block prefix. */
export interface ResolveMountedPageStackInteractionBlockLimitOptions {
  /** Total top-level blocks in the current editor document. */
  readonly totalBlockCount: number;
  /** Zero-based first top-level block affected by the focused edit. */
  readonly firstDirtyBlockIndex: number;
  /** Number of blocks to retain at and after the dirty block for the visible pass. */
  readonly blockWindowSize: number;
}

/** A mounted page surface descriptor returned to the painter. */
export interface QuirePageFrame<Surface> {
  /** Zero-based page index this frame paints. */
  readonly pageIndex: number;
  /** Page rectangle in document space. */
  readonly pageRect: QuireRect;
  /** Backend surface bundle (canvas pair, svg pair, ...). */
  readonly surface: Surface;
}

/** Minimal frame data needed to resolve page-scoped display lists. */
export interface QuirePageStackDisplayListFrame {
  /** Zero-based page index this frame paints. */
  readonly pageIndex: number;
  /** Page rectangle in document space. */
  readonly pageRect: QuireRect;
}

/** Page-stack display-list source resolved for a mounted frame. */
export interface QuirePageStackDisplayListSource {
  /** Canonical retained page-chunk identity that owns this display list. */
  readonly chunkKey: string;
  /** Canonical direct display owners realized into the page chunk. */
  readonly sourceOwnerKeys: readonly string[];
  /** Display list to use for page paint signatures or synchronization. */
  readonly displayList: QuireDisplayList;
  /** Whether `displayList` has already been filtered to the frame viewport. */
  readonly displayListIsViewportScoped?: true | undefined;
}

/** Options for resolving a page-stack display-list source for one frame. */
export interface ResolveQuirePageStackDisplayListSourceForFrameOptions {
  /** Frame whose page-local chunk should be read. */
  readonly frame: QuirePageStackDisplayListFrame;
  /** Chunk index attached to the page-stack render result. */
  readonly pageDisplayListChunks: QuirePageStackDisplayListChunkIndex;
  /** Layer to read from the matching page-local chunk. */
  readonly layer: QuirePageStackDisplayListLayer;
}

/** Options for resolving display lists for mounted page-stack frames. */
export interface ResolveQuirePageStackDisplayListsForFramesOptions {
  /** Mounted frames that need page-scoped display lists. */
  readonly frames: readonly QuirePageStackDisplayListFrame[];
  /** Chunk index attached to the page-stack render result. */
  readonly pageDisplayListChunks: QuirePageStackDisplayListChunkIndex;
  /** Chunk layer to resolve. */
  readonly layer: QuirePageStackDisplayListLayer;
}

/** Options for resolving viewport clip rectangles for a page-stack render. */
export interface ResolveQuirePageStackRenderClipRectsOptions {
  /** Render reason being executed. */
  readonly reason?: string | undefined;
  /** Current page rectangles in document space, indexed by page index. */
  readonly pageRects: readonly QuireRect[];
  /** Page indices currently needed by the viewport coordinator. */
  readonly visiblePageIndices: readonly number[];
  /** Visible document region used before concrete page records exist. */
  readonly visibleRegion?: QuireRect | undefined;
  /** Page geometry used to expand an initial visible region by page buffers. */
  readonly pageGeometry?: QuirePageGeometry | undefined;
  /** Extra neighbouring pages retained around the initial visible region. */
  readonly bufferPages?: number | undefined;
}

/** Options for checking whether a clipped page-stack result is still usable. */
export interface ShouldRefreshQuirePageStackDisplayListClipOptions {
  /** Current page rectangles in document space, indexed by page index. */
  readonly pageRects: readonly QuireRect[];
  /** Page indices currently needed by the viewport coordinator. */
  readonly visiblePageIndices: readonly number[];
  /** Clip rectangles used by the retained render result, if any. */
  readonly clipRects?: readonly QuireRect[] | undefined;
}

/** Inputs for one manager visible-set synchronization. */
export interface QuirePageStackSyncOptions {
  /** Layout pages in document order, indexed by the visible set. */
  readonly pages: readonly QuireLayoutPage[];
  /** Page indices that must have a mounted frame (visible set plus buffer). */
  readonly visiblePageIndices: readonly number[];
  /**
   * Monotonic geometry epoch. When it changes, every frame re-applies geometry
   * even if its pageRect is unchanged. Backends bump it when a backend-global
   * geometry input changes (canvas: device pixel ratio); backends with no such
   * input pass a constant.
   */
  readonly geometryEpoch: number;
}

/** Result of one manager synchronization. */
export interface QuirePageStackSyncResult<Surface> {
  /** Every mounted frame after this sync, ascending page order. */
  readonly frames: readonly QuirePageFrame<Surface>[];
  /** Frames mounted or re-geometried this sync (need a fresh paint). */
  readonly mountedThisSync: readonly QuirePageFrame<Surface>[];
}

/** Per-backend page surface lifecycle + paint. */
export interface QuirePageSurfaceAdapter<Surface> {
  /**
   * Exposes a prepared surface after its backend paint succeeds.
   * @param surface - Successfully painted surface.
   */
  markPainted?(surface: Surface): void;
  /**
   * Creates a detached surface bundle (positioned wrapper + content/overlay).
   * @param ownerDocument - Document used to create elements.
   * @returns Detached surface bundle.
   */
  createSurface(ownerDocument: Document): Surface;
  /**
   * Positions and sizes a surface for the page it now hosts.
   * @param surface - Surface bundle.
   * @param pageIndex - Page index hosted.
   * @param pageRect - Page rectangle in document space.
   */
  applyGeometry(surface: Surface, pageIndex: number, pageRect: QuireRect): void;
  /**
   * Attaches the surface wrapper to the page-stack host.
   * @param surface - Surface bundle.
   * @param host - Page-stack host element.
   */
  attach(surface: Surface, host: HTMLElement): void;
  /**
   * Detaches the surface wrapper from the host (for recycling).
   * @param surface - Surface bundle.
   */
  detach(surface: Surface): void;
  /**
   * Releases resources once a detached surface leaves the reuse pool.
   * @param surface - Detached surface that will never be reused.
   */
  dispose?(surface: Surface): void;
  /**
   * Estimates pooled surface memory in bytes.
   * @param surface - Detached surface bundle being considered for pooling.
   * @returns Estimated bytes held by the surface while it remains pooled.
   */
  estimatePooledSurfaceBytes?(surface: Surface): number;
}

/** Options for createQuirePageStackManager. */
export interface QuirePageStackManagerOptions<Surface> {
  /** Page-stack host element owning the mounted frames. */
  readonly host: HTMLElement;
  /** Owner document used to create frame elements. */
  readonly ownerDocument: Document;
  /** Per-backend surface adapter. */
  readonly adapter: QuirePageSurfaceAdapter<Surface>;
  /** Maximum recycled surface bundles kept for reuse. Defaults to 8. */
  readonly maxPooledFrames?: number | undefined;
  /** Maximum estimated bytes retained by recycled surfaces. Defaults to unbounded. */
  readonly maxPooledSurfaceBytes?: number | undefined;
  /**
   * Bytes recycled surfaces may keep once a sync ends; surfaces still reuse the pool within a sync.
   * Read at the end of every sync; omitted keeps `maxPooledSurfaceBytes` as the only limit.
   * @returns Byte budget.
   */
  readonly readRetainedPoolBytes?: (() => number) | undefined;
}

/** Owns the sparse set of mounted page frames and a recycling pool. */
export interface QuirePageStackManager<Surface> {
  /** Mounts visible frames, recycles the rest, reports freshly mounted frames. */
  sync(options: QuirePageStackSyncOptions): QuirePageStackSyncResult<Surface>;
  /** Reads mounted frames in ascending page order. */
  getFrames(): readonly QuirePageFrame<Surface>[];
  /** Removes every mounted frame and clears the pool. */
  destroy(): void;
}

/** Positioned wrapper and its two recyclable backend drawing surfaces. */
export interface QuirePageStackFrameElements<Surface extends Element> {
  /** Wrapper in document coordinates. */
  readonly frame: HTMLDivElement;
  /** Persistent document content surface. */
  readonly content: Surface;
  /** Transient selection and caret surface. */
  readonly overlay: Surface;
}
