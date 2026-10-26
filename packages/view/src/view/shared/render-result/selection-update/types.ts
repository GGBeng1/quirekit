import type {
  QuireDecorationSourceView,
  QuireDisplayListStyles,
  QuireSurfaceConfig
} from "@quirekit/view-engine";
import type {
  QuireSelectionGeometry,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import type {
  QuireLayoutDirtyRange,
  QuireViewUpdatePatch
} from "@quirekit/view-engine";
import type { QuireLayoutSnapshot, QuireRetainedLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireViewBuildOptions, QuireViewRenderResult } from "../../../types";

/** Options for applying known selection geometry to a retained render result. */
export interface CreateMountedSelectionGeometryRenderResultOptions {
  /** Previous render result whose layout/content can be reused. */
  readonly previousRenderResult: QuireViewRenderResult;
  /** Selection geometry that should drive the next overlay display list. */
  readonly selectionGeometry: QuireSelectionGeometry;
  /** Retained selection context used to build the supplied selection geometry. */
  readonly selectionContext?: QuireSelectionGeometryContext | undefined;
  /** Optional layout snapshot replacement paired with the selection geometry. */
  readonly layoutSnapshot?: QuireRetainedLayoutSnapshot | undefined;
  /** Optional layout dirty range replacement; omitted preserves the previous value. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /** Optional typed invalidation patch replacement; omitted preserves the previous value. */
  readonly updatePatch?: QuireViewUpdatePatch | null | undefined;
  /** Optional display-list style overrides forwarded to overlay command builders. */
  readonly displayListStyles?: Partial<QuireDisplayListStyles> | undefined;
  /** Optional semantic surface styling forwarded to overlay command builders. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
  /** Whether caret commands should be omitted because a DOM caret owns presentation. */
  readonly omitCaretCommands?: boolean | undefined;
  /** Whether the composite display list should be rebuilt from cached content plus overlay. */
  readonly rebuildCompositeDisplayList?: boolean | undefined;
  /** Whether retained page-local chunks should refresh their overlay lists. */
  readonly refreshPageDisplayListChunks?: boolean | undefined;
}

/** Options for rebuilding the overlay-only render result after a selection move. */
export interface CreateMountedSelectionUpdateRenderResultOptions extends Omit<
  CreateMountedSelectionGeometryRenderResultOptions,
  "selectionGeometry" | "layoutSnapshot" | "layoutDirtyRange"
> {
  /** Current editor state carrying the latest ProseMirror selection. */
  readonly state: QuireLayoutSnapshot["state"];
}

/** Options for deciding whether a cached render result can reuse content. */
export interface CanReuseMountedSelectionOverlayRenderResultOptions {
  /** Current frame inputs, read lazily after provider checks to avoid needless DOM reads. */
  readonly frameOptions?: QuireViewBuildOptions | (() => QuireViewBuildOptions | undefined) | undefined;
  /** Current provider source; missing proof conservatively disables reuse. */
  readonly decorationSourceView?: Pick<QuireDecorationSourceView, "someProp"> | undefined;
  /** Previous full render result whose content surfaces would be reused. */
  readonly previousRenderResult: QuireViewRenderResult;
  /** Current editor state whose selection should update the overlay. */
  readonly state: QuireLayoutSnapshot["state"];
  /** Whether the active textblock must already be materialized in the snapshot. */
  readonly requireMaterializedSelectionTextblock?: boolean | undefined;
}

/** Runtime-activated artifacts a selection update replaces. */
export interface MountedRuntimeLayerReplacement {
  /** Product and DOM overlay ids whose prior realization is discarded. */
  readonly runtimeLayerRealizationIds: {
    /** Display product ids of activated contributions whose owner chunks must be rebuilt. */
    readonly productIds: ReadonlySet<string>;
    /** Stable DOM overlay ids whose previous realization must be discarded. */
    readonly domOverlayIds: ReadonlySet<string>;
  };
  /** Top-level overlay command ids removed before the current activation is painted. */
  readonly replacedOverlayCommandIds: ReadonlySet<string>;
}
