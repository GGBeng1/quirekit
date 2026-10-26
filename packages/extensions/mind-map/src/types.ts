import type { QuireEditor } from "@quirekit/core";
import type { MindMapDocument, MindMapEmbed, MindMapEditRequest, MindMapRasterSnapshot } from "@quirekit/mind-map";
/**
 * Renders a mind map to a PNG offscreen, supplied by the host.
 * @param document - Mind map to render.
 * @param editor - Owning editor.
 * @returns PNG bound to that exact mind map.
 */
export type MindMapRenderer = (document: MindMapDocument, editor: QuireEditor) => Promise<MindMapRasterSnapshot>;
/** Host-installed UI and rendering; semantic nodes do not import a framework or drawing runtime. */
export interface MindMapOptions {
  /** @param request - Captured target. @param editor - Owning instance. @returns Disposable UI task. */
  readonly open: ((request: MindMapEditRequest, editor: QuireEditor) => { close(): void }) | null;
  /** Offscreen renderer used by Agent edits; absent hosts cannot render for the Agent. */
  readonly render?: MindMapRenderer | null | undefined;
}
/** Editor captured at creation for Agent command preparation. */
export interface MindMapStorage {
  /** Owning editor while it exists. */ editor: QuireEditor | undefined;
}
/** Typed insertion intent. */
export interface MindMapInsertion {
  /** Validated portable source. */ readonly document: MindMapEmbed;
  /** Explicit mapped selection start, defaulting to current selection. */ readonly from?: number;
  /** Explicit mapped selection end. */ readonly to?: number;
}
/** Compare-and-swap edit intent. */
export interface MindMapUpdate {
  /** Current mapped atom position. */ readonly position: number;
  /** Exact original JSON, preventing silent overwrite. */ readonly expected: string;
  /** Next source revision and its matching preview. */ readonly document: MindMapEmbed;
}
