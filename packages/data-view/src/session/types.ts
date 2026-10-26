import type { DataView, DataViewEmbed } from "../model/types";
import type { DataMutationVersion, DataOperation, DataViewMutationOptions } from "../operations/types";

/** Prepared save; hosts must map and recheck the exact target before committing. */
export interface DataViewSave {
  /** Serialized source captured when the draft opened. */
  readonly base: string;
  /** Complete next embed, detached from draft history. */
  readonly value: DataViewEmbed;
}
/** A local authoring draft, never a second document persistence authority. */
export interface DataViewDraft {
  /** Whether the draft differs from the original source. */
  readonly dirty: boolean;
  /** Whether a previous local state is retained. */
  readonly canUndo: boolean;
  /** Whether an undone state can be restored. */
  readonly canRedo: boolean;
  /** Reads an independent current value. @returns Detached current embed. */
  read(): DataViewEmbed;
  /** Applies one complete inline mutation batch.
   * @param operations - Atomic changes.
   * @param version - Conditional source and resulting revision.
   * @param options - View-local projection changes published in the same undo step.
   */
  apply(operations: readonly DataOperation[], version: DataMutationVersion, options?: DataViewMutationOptions): void;
  /** Replaces an existing authored view. @param view - New view configuration. */
  replaceView(view: DataView): void;
  /** Restores one retained local state. @returns Whether history changed. */
  undo(): boolean;
  /** Reapplies one local state. @returns Whether history changed. */
  redo(): boolean;
  /** Produces a conditional host commit without persisting anything. @returns Source precondition and next embed. */
  prepare(): DataViewSave;
  /** Discards state and makes subsequent editing invalid. */
  dispose(): void;
}

/** Host acknowledgement; a failed save keeps the local draft open. */
export interface DataViewCommitResult {
  /** Whether the document accepted this exact conditional change. */
  readonly accepted: boolean;
  /** User-visible recovery guidance on failure. */
  readonly message?: string;
}
/** Document-owned target; opening a workspace never changes the document. */
export interface DataViewEditRequest {
  /** Exact source at opening. */
  readonly value: DataViewEmbed;
  /** Conditional save, with target mapping and permission checks owned by the host.
   * @param save - Original source and proposed value.
   * @returns Document acceptance.
   */
  commit(save: DataViewSave): DataViewCommitResult | Promise<DataViewCommitResult>;
  /** Releases mapped anchors and subscriptions; must be idempotent. */
  release(): void;
}
