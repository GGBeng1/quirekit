import type { QuireEditor } from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";
import { canvasViewExtension, svgViewExtension } from "@quirekit/view";
import type { ResolvedClassicEditorOptions } from "../options";

/**
 * Creates fresh readonly renderers with the product's current presentation settings.
 * @param source - Canonical session, retained independently of the result snapshot.
 * @param document - Same-schema immutable result document.
 * @param resolved - Current product configuration and media resolver.
 * @param viewport - Shared native scroll authority used by the canvas page stack.
 * @returns Unmounted snapshot whose caller owns mounting and destruction.
 */
export function createClassicEditorReadOnlySnapshot(
  source: QuireEditor,
  document: PMNode,
  resolved: ResolvedClassicEditorOptions,
  viewport: HTMLElement
): QuireEditor {
  // Presentation configuration is reusable; host callbacks and worker lifetimes
  // belong to the live session and must never be replayed by a preview.
  const canvas = canvasViewExtension({ runtime: {
    ...resolved.canvasRuntime,
    onRender: undefined,
    onFocusChange: undefined,
    onPointerHitTest: undefined,
    onUpdateSchedule: undefined,
    onVisiblePagesChange: undefined,
    requestUpdateFrame: undefined,
    cancelUpdateFrame: undefined,
    layoutWorkerHost: undefined,
    mediaResolver: resolved.media.resolver,
    pageStack: true,
    scrollSource: "viewport",
    scrollViewport: viewport,
    viewportPadding: resolved.canvasRuntime.viewportPadding ?? { left: 0, top: 16, right: 0, bottom: 16 }
  } });
  const svg = svgViewExtension({ runtime: {
    ...resolved.svgRuntime,
    onRender: undefined,
    onFocusChange: undefined,
    onPointerHitTest: undefined,
    onUpdateSchedule: undefined,
    requestUpdateFrame: undefined,
    cancelUpdateFrame: undefined,
    mediaResolver: resolved.media.resolver,
    textMeasurementBackend: resolved.svgRuntime.textMeasurementBackend ?? "browser",
    viewportPadding: resolved.svgRuntime.viewportPadding ?? { left: 0, top: 16, right: 0, bottom: 16 }
  } });
  return source.createReadOnlySnapshot({
    document,
    viewAdapters: [...(canvas.viewAdapters ?? []), ...(svg.viewAdapters ?? [])]
  });
}
