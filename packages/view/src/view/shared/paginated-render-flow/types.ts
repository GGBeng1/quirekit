import type {
  QuireImePreedit,
  QuireLayoutDirtyRange,
  QuireResolvedDocumentProfile,
  QuireViewUpdatePatch
} from "@quirekit/view-engine";
import type { QuireMountedEditorViewUpdateOptions } from "../types";
import type { MountedPaginatedSurfaceLifecycle } from "../lifecycle";
import type {
  PrepareQuirePageStackFillRenderOptions,
  QuirePageStackFillAdvance,
  QuirePageStackFillRenderWindow
} from "../page-stack";

/** Read-only page authorities needed to project a current frame clip window. */
export type MountedPaginatedLayoutWindow = Pick<MountedPaginatedSurfaceLifecycle<unknown>,
  "getPageRects" | "resolveVisiblePageIndices" | "getVisibleRegion"
>;

/** One mounted update accepted by the shared paginated render flow. */
export interface MountedPaginatedRenderUpdate<Reason extends string> {
  /** Semantic reason for the mounted update. */
  readonly reason: Reason;
  /** Optional IME preview that replaces the flow's current preedit state. */
  readonly imePreedit?: QuireImePreedit | undefined;
  /** Transactions folded into the scheduled mounted update. */
  readonly transactions?: QuireMountedEditorViewUpdateOptions["transactions"];
}

/** Backend-neutral document render request emitted by the shared flow. */
export interface MountedPaginatedDocumentRenderRequest<Reason extends string> {
  /** Semantic reason for this document render. */
  readonly reason: Reason;
  /** Current IME preview retained across scroll and fill renders. */
  readonly imePreedit?: QuireImePreedit | undefined;
  /** Canonical layout dirty range derived from the triggering transactions. */
  readonly layoutDirtyRange: QuireLayoutDirtyRange | null;
  /** Canonical retained-product invalidation projected for this render. */
  readonly updatePatch: QuireViewUpdatePatch;
  /** Optional viewport-first layout window for a paginated backend. */
  readonly fillWindow?: QuirePageStackFillRenderWindow | undefined;
}

/** Frame inputs accepted by optional one-shot callers as well as mounted flow. */
export type MountedPaginatedLayoutRequest = Omit<
  MountedPaginatedDocumentRenderRequest<string>, "layoutDirtyRange" | "updatePatch"
> & {
  /** Optional dirty range; absent evidence cannot admit retained layout. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /** Optional update proof; absent evidence requires a full build. */
  readonly updatePatch?: QuireViewUpdatePatch | null | undefined;
};

/** Backend capabilities consumed by one mounted paginated render flow. */
export interface CreateMountedPaginatedRenderFlowOptions<Reason extends string> {
  /** Reason that initializes viewport-first rendering. */
  readonly initialReason: Reason;
  /** Reason that installs a complete replacement document generation. */
  readonly documentReplaceReason: Reason;
  /** Reason that carries committed document transactions. */
  readonly transactionReason: Reason;
  /** Reason that updates speculative IME preedit state. */
  readonly compositionReason: Reason;
  /** Reports whether the owning mount can still accept render work. */
  readonly readDestroyed: () => boolean;
  /** Reports whether focused interaction should rebound background fill. */
  readonly readFocused: () => boolean;
  /** Reads the current top-level document block count. */
  readonly readTopLevelBlockCount: () => number;
  /** Table and drawing models resolving local dirty identity; the neutral models have neither. */
  readonly documentProfile?: Pick<QuireResolvedDocumentProfile, "tableModel" | "drawingModel"> | undefined;
  /** Reads the current selection head's top-level block index. */
  readonly readSelectionHeadTopLevelBlockIndex: () => number;
  /** Reports whether this reason can reuse retained content for an overlay update. */
  readonly canReuseSelectionUpdate: (
    reason: Reason,
    request?: MountedPaginatedDocumentRenderRequest<Reason>
  ) => boolean;
  /** Renders one retained selection-only update. */
  readonly renderSelectionUpdate: (
    reason: Reason,
    updatePatch: QuireViewUpdatePatch
  ) => void;
  /** Projects semantic document facts into an optional paginated fill window. */
  readonly prepareFillRender: (
    options: PrepareQuirePageStackFillRenderOptions
  ) => QuirePageStackFillRenderWindow | undefined;
  /** Reports whether scroll and fill callbacks have a render state to refresh. */
  readonly canRefreshDocument: () => boolean;
  /** Executes one backend-specific document render from canonical flow facts. */
  readonly renderDocument: (
    request: MountedPaginatedDocumentRenderRequest<Reason>
  ) => void;
}

/** Shared update, refresh, and fill-advance authority for a paginated mount. */
export interface MountedPaginatedRenderFlow<Reason extends string> {
  /** Current IME preedit retained by the mounted flow. */
  readonly imePreedit: QuireImePreedit | undefined;
  /**
   * Projects and renders one scheduled mounted update.
   *
   * @param update - Scheduled reason, preedit, and transaction facts.
   */
  renderUpdate(update: MountedPaginatedRenderUpdate<Reason>): void;
  /**
   * Refreshes the current document after viewport presentation changes.
   *
   * @param reason - Backend-neutral refresh reason.
   */
  refreshDocument(reason: Reason): void;
  /**
   * Applies one accepted page-stack fill advance.
   *
   * @param reason - Render reason used for fill reconciliation.
   * @param advance - Canonical fill window advance.
   */
  applyFillAdvance(reason: Reason, advance: QuirePageStackFillAdvance): void;
}
