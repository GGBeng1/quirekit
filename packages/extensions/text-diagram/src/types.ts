import type { QuireEditor } from "@quirekit/core";
import type { TextDiagramEmbed, TextDiagramEditRequest, TextDiagramLanguage, TextDiagramRaster } from "@quirekit/text-diagram";
/**
 * Renders a diagram source to a PNG offscreen, supplied by the host.
 * @param language - Diagram grammar.
 * @param source - Complete source.
 * @param editor - Owning editor.
 * @returns PNG bound to that exact source.
 */
export type TextDiagramRenderer = (language: TextDiagramLanguage, source: string, editor: QuireEditor) => Promise<TextDiagramRaster>;
/** Host-installed UI and rendering; semantic nodes do not import a framework or drawing runtime. */
export interface TextDiagramOptions {
  /** @param request - Captured target. @param editor - Owning instance. @returns Disposable UI task. */
  readonly open: ((request: TextDiagramEditRequest, editor: QuireEditor) => { close(): void }) | null;
  /** Offscreen renderer used by Agent edits; absent hosts cannot render for the Agent. */
  readonly render?: TextDiagramRenderer | null | undefined;
}
/** Editor captured at creation for Agent command preparation. */
export interface TextDiagramStorage {
  /** Owning editor while it exists. */ editor: QuireEditor | undefined;
}
/** Typed insertion intent. */
export interface TextDiagramInsertion {
  /** Validated portable source. */ readonly document: TextDiagramEmbed;
  /** Explicit mapped selection start, defaulting to current selection. */ readonly from?: number;
  /** Explicit mapped selection end. */ readonly to?: number;
}
/** Compare-and-swap edit intent. */
export interface TextDiagramUpdate {
  /** Current mapped atom position. */ readonly position: number;
  /** Exact original JSON, preventing silent overwrite. */ readonly expected: string;
  /** Next source revision and its matching preview. */ readonly document: TextDiagramEmbed;
}
