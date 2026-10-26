import type { QuireViewRenderResult } from "../../types";
import { createMountedSelectionGeometryRenderResult } from "../../shared";
import { createSvgGeometryProvider } from "./provider";
import type { CreateSvgBrowserMeasuredRenderResultOptions } from "./types";

/**
 * Rebuilds SVG selection geometry from the browser's rendered SVG text positions.
 *
 * @param options - Render result, rendered SVG text roots, and overlay style inputs.
 * @returns Render result whose selection geometry and overlay display list use SVG measurements.
 */
export function createSvgBrowserMeasuredRenderResult(
  options: CreateSvgBrowserMeasuredRenderResultOptions
): QuireViewRenderResult {
  const provider = options.geometryProvider ?? createSvgGeometryProvider(options);

  if (options.browserMeasureProbe === true) {
    provider.runWidthProbe();
  }

  if (options.preserveSelectionGeometry === true) {
    return options.renderResult;
  }

  const selectionGeometry = provider.resolveSelectionGeometry({
    renderResult: options.renderResult,
    trace: options.trace
  });

  if (
    provider.measurements.length === 0 ||
    selectionGeometry === options.renderResult.selectionGeometry
  ) {
    return options.renderResult;
  }

  return createMountedSelectionGeometryRenderResult({
    previousRenderResult: options.renderResult,
    selectionGeometry,
    refreshPageDisplayListChunks: true,
    ...(options.styles === undefined
      ? {}
      : { displayListStyles: options.styles }),
    ...(options.surfaceConfig === undefined
      ? {}
      : { surfaceConfig: options.surfaceConfig }),
    ...(options.omitCaretCommands === undefined
      ? {}
      : { omitCaretCommands: options.omitCaretCommands })
  });
}
