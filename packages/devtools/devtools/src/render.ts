import type { CanvasMountedViewRenderEvent, QuireMountedViewRenderEvent } from "@quirekit/view";
import type { HtmlMountedViewRuntimeOptions } from "@quirekit/view-html";
import type {
  QuireDevtoolsRectSummary,
  QuireDevtoolsRenderSummary,
  QuireDevtoolsUpdatePatchSummary
} from "./types";

/** Existing retained HTML callback event shape. */
type DevtoolsHtmlMountedRenderEvent = Parameters<
  NonNullable<HtmlMountedViewRuntimeOptions["onRender"]>
>[0];

/**
 * Summarizes a mounted Canvas render event for devtools logs.
 *
 * @param event - Canvas mounted render event.
 * @returns Render summary suitable for snapshots and performance entries.
 */
export function summarizeCanvasRenderEvent(
  event: CanvasMountedViewRenderEvent
): QuireDevtoolsRenderSummary {
  return summarizeMountedRenderEvent(event);
}

/**
 * Summarizes any mounted render event for devtools logs.
 *
 * @param event - Mounted render event.
 * @returns Render summary suitable for snapshots and performance entries.
 */
export function summarizeMountedRenderEvent(
  event: QuireMountedViewRenderEvent
): QuireDevtoolsRenderSummary {
  const { renderResult } = event;
  const viewportRect = event.viewportRect ?? renderResult.layoutSnapshot.viewportRect;
  const displaySize = event.displaySize ?? {
    width: viewportRect.width,
    height: viewportRect.height
  };
  const phases = event.phases?.map((phase) => ({
    name: phase.name,
    startedAt: phase.startedAt,
    endedAt: phase.endedAt,
    durationMs: phase.durationMs
  }));
  const durationMs = phases === undefined ? undefined : resolvePhaseSpanDuration(phases);
  const updatePatch = summarizeUpdatePatch(renderResult.updatePatch);
  const retainedHtml = event.view?.mode === "html"
    ? (event as Partial<DevtoolsHtmlMountedRenderEvent>).diagnostics
    : undefined;
  const pageContentCache = event.view?.mode === "canvas"
    ? (event as Partial<CanvasMountedViewRenderEvent>).pageContentCache
    : undefined;

  return {
    viewId: event.view?.id ?? "unknown",
    mode: event.view?.mode ?? "unknown",
    ...(event.strategy === undefined ? {} : { strategy: event.strategy }),
    ...(event.reason === undefined ? {} : { reason: event.reason }),
    commandCount: countRenderResultCommands(renderResult),
    blockCount: renderResult.layoutSnapshot.root.children?.length ?? 0,
    caretCount: renderResult.selectionGeometry.carets.length,
    selectionRangeCount: renderResult.selectionGeometry.ranges.length,
    overlayCount: renderResult.domOverlays.length,
    documentRect: summarizeRect(renderResult.layoutSnapshot.documentRect),
    viewportRect: summarizeRect(viewportRect),
    displayWidth: displaySize.width,
    displayHeight: displaySize.height,
    ...(event.devicePixelRatio === undefined ? {} : { devicePixelRatio: event.devicePixelRatio }),
    ...(durationMs === undefined ? {} : { durationMs }),
    ...(phases === undefined ? {} : { phases }),
    ...(renderResult.cacheCounters === undefined
      ? {}
      : { cacheCounters: renderResult.cacheCounters }),
    ...(renderResult.displayChunkCounters === undefined
      ? {}
      : { displayChunkCounters: renderResult.displayChunkCounters }),
    displayOwnerDiagnostics: renderResult.displayOwnerDiagnostics,
    ...(updatePatch === undefined ? {} : { updatePatch }),
    ...(retainedHtml === undefined ? {} : { retainedHtml }),
    ...(pageContentCache === undefined ? {} : { pageContentCache })
  };
}

/**
 * Counts commands from their canonical render-result owner.
 *
 * @param renderResult - Render result summarized by Devtools.
 * @returns Composite command count, or page-local count for chunked page stacks.
 */
function countRenderResultCommands(
  renderResult: QuireMountedViewRenderEvent["renderResult"]
): number {
  if (renderResult.pageDisplayListChunks === undefined) {
    return renderResult.displayList.commands.length;
  }

  let commandCount = 0;
  for (const chunk of renderResult.pageDisplayListChunks.chunks) {
    commandCount += chunk.contentDisplayList.commands.length;
    commandCount += chunk.overlayDisplayList.commands.length;
  }
  return commandCount;
}

/**
 * Summarizes the typed update patch carried by a render result.
 *
 * @param updatePatch - Render update patch, when provided by the view runtime.
 * @returns Devtools-safe update patch summary, or undefined when unavailable.
 */
function summarizeUpdatePatch(
  updatePatch: QuireMountedViewRenderEvent["renderResult"]["updatePatch"]
): QuireDevtoolsUpdatePatchSummary | undefined {
  if (updatePatch === undefined || updatePatch === null) {
    return undefined;
  }

  return {
    ...(updatePatch.sourceReason === undefined
      ? {}
      : { sourceReason: updatePatch.sourceReason }),
    transactionCount: updatePatch.transactionCount,
    docChanged: updatePatch.docChanged,
    selectionChanged: updatePatch.selectionChanged,
    compositionChanged: updatePatch.compositionChanged,
    causes: [...updatePatch.causes],
    invalidatedProducts: [...updatePatch.invalidatedProducts]
  };
}

/**
 * Resolves the wall-clock duration covered by a render phase list.
 *
 * Render phases may be nested: `build-render-result` wraps layout collection,
 * pagination, and adaptation phases. Summing every phase double-counts nested work,
 * so diagnostics use the measured span from the first phase start to the last phase
 * end.
 *
 * @param phases - Render phases reported by the mounted view runtime.
 * @returns Wall-clock duration covered by the phases.
 */
function resolvePhaseSpanDuration(
  phases: readonly { readonly startedAt: number; readonly endedAt: number }[]
): number {
  if (phases.length === 0) {
    return 0;
  }

  let startedAt = phases[0]!.startedAt;
  let endedAt = phases[0]!.endedAt;

  for (const phase of phases.slice(1)) {
    startedAt = Math.min(startedAt, phase.startedAt);
    endedAt = Math.max(endedAt, phase.endedAt);
  }

  return endedAt - startedAt;
}

/**
 * Copies a canvas rectangle into a devtools-safe summary object.
 *
 * @param rect - Rectangle to summarize.
 * @returns Rectangle summary.
 */
function summarizeRect(rect: QuireDevtoolsRectSummary): QuireDevtoolsRectSummary {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height
  };
}
