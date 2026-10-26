import type { DataSourceProvider, DataViewEmbed } from "@quirekit/data-view";
import type { QuireKitTheme } from "@quirekit/ui";

export type { DataViewEditRequest, DataViewCommitResult } from "@quirekit/data-view";
import type { DataViewCommitResult, DataViewEditRequest, DataViewSave } from "@quirekit/data-view";

/** Controlled document surface; each complete edit is acknowledged by its host. */
export interface DataViewInlineProps {
  /** Current canonical document value, including undo and external changes. */
  readonly value: DataViewEmbed;
  /** Prevents authoring while allowing local view navigation. */
  readonly readOnly?: boolean | undefined;
  /** Exact-source persistence callback. @param save - Complete conditional edit. @returns Host receipt. */
  readonly commit: (save: DataViewSave) => DataViewCommitResult | Promise<DataViewCommitResult>;
  /** Document undo, used only outside native text input. @returns Whether history changed. */
  readonly undo?: (() => boolean) | undefined;
  /** Document redo, used only outside native text input. @returns Whether history changed. */
  readonly redo?: (() => boolean) | undefined;
}

/** One independently owned modal task. */
export interface DataViewDialogOptions {
  /** Document-owned target. */
  readonly request: DataViewEditRequest;
  /** DOM owner, including embedded documents. */
  readonly ownerDocument: Document;
  /** Host appearance. */
  readonly theme?: QuireKitTheme;
  /** Explicit loader for external sources. */
  readonly provider?: DataSourceProvider;
  /** Prohibits all authored changes. */
  readonly readOnly?: boolean;
  /** Host lifetime cancellation. */
  readonly signal?: AbortSignal;
}
/** Idempotent modal cancellation. */
export interface DataViewDialogHandle {
  /** Closes the workspace and releases its request without saving. */
  close(): void;
}
/** Shared component contract, independent of any document host. */
export interface DataViewWorkspaceProps {
  /** The canonical source captured on mount. */
  readonly value: DataViewEmbed;
  /** External source resolver. */
  readonly provider?: DataSourceProvider | undefined;
  /** Prohibits authored changes. */
  readonly readOnly?: boolean | undefined;
  /** Host save in progress. */
  readonly busy?: boolean | undefined;
}
