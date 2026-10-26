import type { QuireEditor } from "@quirekit/core";
import type { WhiteboardActionsMount, WhiteboardDocument, WhiteboardEditRequest, WhiteboardScene, WhiteboardSceneRenderer } from "@quirekit/whiteboard";
/** Host-installed UI; semantic nodes do not import a framework or drawing runtime. */
export interface WhiteboardOptions {
  /** @param request - Captured target. @param editor - Owning instance. @returns Disposable UI task. */
  readonly open: ((request: WhiteboardEditRequest, editor: QuireEditor) => { close(): void }) | null;
  /** Host's lightweight title task, sharing exact source acceptance. */ readonly rename?: WhiteboardOptions["open"];
  /** Optional product toolbar for the selected DOM preview. */ readonly mountActions?: WhiteboardActionsMount<HTMLElement>;
  /** @param scene - Frozen native source. @param editor - Owning document. @returns Matching source/PNG snapshot. */
  readonly renderScene?: ((scene: WhiteboardScene, editor: QuireEditor) => ReturnType<WhiteboardSceneRenderer>) | null;
}
/** Instance-owned runtime binding; descriptors are collected before editor creation. */
export interface WhiteboardStorage {
  /** Current source owner, released when the extension is destroyed. */
  editor: QuireEditor | undefined;
}
/** Typed insertion intent. */
export interface WhiteboardInsertion {
  /** Validated portable source. */ readonly document: WhiteboardDocument;
  /** Explicit mapped selection start, defaulting to current selection. */ readonly from?: number;
  /** Explicit mapped selection end. */ readonly to?: number;
}
/** Compare-and-swap edit intent. */
export interface WhiteboardUpdate {
  /** Current mapped atom position. */ readonly position: number;
  /** Exact original JSON, preventing silent overwrite. */ readonly expected: string;
  /** Next source revision and its matching preview. */ readonly document: WhiteboardDocument;
}
