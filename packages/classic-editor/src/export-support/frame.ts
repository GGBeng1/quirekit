import {
  createQuireEditorDecorationSourceView,
  createQuireViewEngineRuntime
} from "@quirekit/view-engine";
import { ClassicEditorFixedLayoutFrameError } from "./error";
import type {
  BuildClassicEditorFixedLayoutFrameOptions,
  ClassicEditorFixedLayoutFrame
} from "./types";

/**
 * Compiles one targetless, full-document frame for a fixed-layout adapter.
 *
 * This is the sole transitional Classic entry into the View-owned frame
 * pipeline. DR-08 may move that pipeline into View Engine without reopening
 * PDF/OFD adapter ownership.
 *
 * @param options - Editor, geometry, and measurement authorities.
 * @returns Ordered immutable content pages and their measurement authority.
 */
export function buildClassicEditorFixedLayoutFrame(
  options: BuildClassicEditorFixedLayoutFrameOptions
): ClassicEditorFixedLayoutFrame {
  // Compile the complete persistent document without mounted viewport limits or
  // presentation overlays; page-local content chunks are the export boundary.
  const result = createQuireViewEngineRuntime({
    editor: options.editor
  }).buildFrame({
    viewportRect: options.geometry.viewportRect,
    ...(options.geometry.pageGeometry === undefined
      ? {}
      : { pageGeometry: options.geometry.pageGeometry }),
    textMeasurer: options.textMeasurer,
    decorationSourceView: createQuireEditorDecorationSourceView(options.editor),
    decorationScope: "persistent-content",
    requirePageDisplayListChunks: true,
    omitCaretCommands: true
  });
  const chunks = result.pageDisplayListChunks?.chunks;
  if (chunks === undefined || chunks.length === 0) {
    throw new ClassicEditorFixedLayoutFrameError(
      "physical-pages-unavailable",
      "Classic fixed-layout compilation did not produce physical page chunks."
    );
  }

  const pages = [...chunks]
    .sort((left, right) => left.pageIndex - right.pageIndex)
    .map((chunk) => Object.freeze({
      pageIndex: chunk.pageIndex,
      pageRect: Object.freeze({ ...chunk.pageRect }),
      contentDisplayList: chunk.contentDisplayList
    }));

  return Object.freeze({
    pages: Object.freeze(pages),
    textMeasurer: options.textMeasurer
  });
}
