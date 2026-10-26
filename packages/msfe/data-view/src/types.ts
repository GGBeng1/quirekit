import type { ComponentViewRenderer, MsfeEditor, MsfeSourceRange } from "@quirekit/msfe-core";
import type { DataViewEditRequest, DataViewEmbed } from "@quirekit/data-view";
/** Source-backed feature host. */
export interface MsfeDataViewOptions {
  /** Optional in-document editor, mounted inside the existing component host. */
  readonly render?: ComponentViewRenderer<MsfeDataViewSurface> | null;
  /** Opens a mapped source task.
   * @param request - Conditional source target.
   * @param editor - Owning editor.
   * @returns Disposable workspace.
   */
  readonly open: ((request: DataViewEditRequest, editor: MsfeEditor) => {close(): void}) | null;
}
/** Semantic attributes derived from the canonical fence. */
export interface MsfeDataViewAttributes {
  /** Complete source envelope. */ readonly dataView: DataViewEmbed;
}
/** Bounded static preview props. */
export interface MsfeDataViewPreview extends MsfeDataViewAttributes {
  /** Exact current fence. */ readonly range: MsfeSourceRange;
  /** Source permission. */ readonly readOnly: boolean;
}

/** Source-controlled editing surface; persistence and history remain with MSFE. */
export interface MsfeDataViewSurface extends MsfeDataViewPreview {
  /** Commits one complete edit against the exact source version.
   * @param save - Source precondition and proposed value.
   * @returns Host acknowledgement, including stale-source refusals.
   */
  readonly commit: DataViewEditRequest["commit"];
  /** Restores a document history event. @returns Whether history changed. */
  readonly undo: () => boolean;
  /** Reapplies a document history event. @returns Whether history changed. */
  readonly redo: () => boolean;
}
