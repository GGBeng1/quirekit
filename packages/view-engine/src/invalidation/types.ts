import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type { Transaction } from "@quirekit/pm";
import type { QuireSelectionGeometry } from "../interaction";

/** Document range that should be recomputed by the canvas view. */
export interface QuireInvalidationRange extends QuireDocumentRange {}

/** Plan describing document and viewport areas that need recomputation. */
export interface QuireInvalidationPlan {
  /** Document ranges that need layout or display-list recomputation. */
  readonly ranges: readonly QuireInvalidationRange[];
  /** Viewport rectangles that need repainting. */
  readonly viewportRects: readonly QuireRect[];
}

/** Options used to derive invalidation from selection geometry changes. */
export interface QuireSelectionInvalidationOptions {
  /** Selection geometry from the previous render pass. */
  readonly previousSelectionGeometry: QuireSelectionGeometry;
  /** Selection geometry from the next render pass. */
  readonly nextSelectionGeometry: QuireSelectionGeometry;
}

/** Canonical layout-affecting cause owned by a dirty range. */
export type QuireLayoutDirtyReason =
  | "content"
  | "floating-object-placement"
  | "table-content"
  | "table-structure"
  | "table-style"
  | "font-epoch"
  | "image-epoch"
  | "width-change"
  | "fallback";

/** Table-local invalidation category proven from a transaction. */
export type QuireTableLayoutDirtyReason =
  | "cell-content"
  | "cell-layout"
  | "row-layout"
  | "structure"
  | "style"
  | "border-style";

/** Exact table-local identity affected by a layout edit. */
export interface QuireTableLayoutDirtyTarget {
  /** Stable table block identity shared with layout products. */
  readonly tableId: string;
  /** Semantic cell identity when one cell owns the edit. */
  readonly semanticCellId?: string | undefined;
  /** Zero-based source row index when one row owns the edit. */
  readonly rowIndex?: number | undefined;
  /** Table-local invalidation category. */
  readonly reason: QuireTableLayoutDirtyReason;
}

/** Exact floating-object identity affected by placement or wrap work. */
export interface QuireFloatingObjectLayoutDirtyTarget {
  /** Stable anchored-object identity. */
  readonly objectId: string;
  /** Stable drawing payload identity. */
  readonly drawingId: string;
  /** Exact post-transform position before the anchor atom. */
  readonly anchorPosition: number;
  /** Floating-object dependency class proven by the transaction. */
  readonly reason: "wrap-placement";
}

/** Explicit identity gap that prevents bounded layout invalidation. */
export interface QuireInvalidationIdentityGap {
  /** Stable machine-readable gap code. */
  readonly code:
    | "table-cell-unresolved"
    | "table-map-invalid"
    | "floating-object-relocation-unresolved"
    | "floating-object-identity-unresolved";
  /** Human-readable diagnostic explaining why bounded invalidation was rejected. */
  readonly message: string;
}

/** Precise text-edit metadata carried by a content dirty range. */
export interface QuireLayoutTextEditHint {
  /** Post-transform document position where the local text edit starts. */
  readonly from: number;
  /** Number of UTF-16 text positions inserted by the edit. */
  readonly inserted: number;
  /** Number of UTF-16 text positions deleted by the edit. */
  readonly deleted: number;
}

/** Document range and top-level block anchor affected by a layout edit. */
export interface QuireLayoutDirtyRange {
  /** Invalidation category that produced this dirty range. */
  readonly reason: QuireLayoutDirtyReason;
  /** Changed document range in post-transform coordinates. */
  readonly changedRange: QuireDocumentRange;
  /** Index of the first top-level block affected in the post-transform document. */
  readonly firstTopLevelBlockIndex: number;
  /** Post-transform range of the first affected top-level block. */
  readonly firstTopLevelBlockRange: QuireDocumentRange;
  /** Precise text-edit metadata for single-step text changes, when known. */
  readonly textEdit?: QuireLayoutTextEditHint | undefined;
  /** Exact table-local target when the transaction proves its identity. */
  readonly tableTarget?: QuireTableLayoutDirtyTarget | undefined;
  /** Exact floating-object target when placement identity is proven. */
  readonly floatingObjectTarget?: QuireFloatingObjectLayoutDirtyTarget | undefined;
  /** Identity gaps that forced conservative invalidation. */
  readonly identityGaps?: readonly QuireInvalidationIdentityGap[] | undefined;
}

/** Canonical invalidation cause carried by a mounted view update patch. */
export type QuireViewInvalidationCause =
  | "selection"
  | "scroll"
  | "hover"
  | "presentation"
  | "focus"
  | "composition-preview"
  | "content"
  | "floating-object-placement"
  | "table-structure"
  | "table-style"
  | "font-epoch"
  | "image-epoch"
  | "image-paint"
  | "width-change"
  | "fallback";

/** Retained product invalidated by a mounted view update patch. */
export type QuireViewInvalidatedProduct =
  | "layout"
  | "content"
  | "overlay"
  | "viewport";

/** Typed invalidation envelope derived from transactions and view update reason. */
export interface QuireViewUpdatePatch {
  /** Diagnostic event label supplied by the mounted runtime, when available. */
  readonly sourceReason?: string | undefined;
  /** Number of transactions folded into this update. */
  readonly transactionCount: number;
  /** Whether any folded transaction changed document content. */
  readonly docChanged: boolean;
  /** Whether the update changed editor selection or caret state. */
  readonly selectionChanged: boolean;
  /** Whether the update carries IME composition state. */
  readonly compositionChanged: boolean;
  /** Ordered canonical causes used by diagnostics and retained schedulers. */
  readonly causes: readonly QuireViewInvalidationCause[];
  /** Retained products that must be recomputed for this update. */
  readonly invalidatedProducts: readonly QuireViewInvalidatedProduct[];
  /** Layout dirty range produced by content changes, when known. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
}

/** Options used to derive a typed mounted-view update patch. */
export interface DeriveQuireViewUpdatePatchOptions {
  /** Mounted backend update reason, when known. */
  readonly reason?: string | undefined;
  /** Transactions folded into the mounted update. */
  readonly transactions?: readonly Transaction[] | undefined;
  /** Layout dirty range already derived for the same transactions. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
}
