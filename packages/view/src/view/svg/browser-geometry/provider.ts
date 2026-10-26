import { collectSvgTextMeasurements } from "./measurements";
import { traceQuireViewPhase } from "../../facade/trace";
import { buildSvgMeasuredSelectionGeometry } from "./selection";
import { runSvgBrowserTextWidthProbe } from "./probe";
import { hitTestSvgBrowserMeasurements } from "./hit/measurements";
import { resolveSvgBrowserMeasurementsCoordsAtPos } from "./coords-at-pos-measurements";
import type {
  CreateSvgGeometryProviderOptions,
  SvgBrowserTextWidthProbeReport,
  SvgGeometryProvider,
  SvgGeometryProviderSelectionOptions,
  SvgGeometryProviderCoordsAtPosOptions,
  SvgGeometryProviderHitTestOptions
} from "./types";
import type { QuireHitTestResult, QuireSelectionGeometry } from "@quirekit/view-engine";
import type { QuireViewCoordsAtPosResult } from "../../shared";

/**
 * Creates the browser-measured geometry provider for one rendered SVG frame set.
 *
 * @param options - Render result, rendered SVG roots, and optional trace sink.
 * @returns Provider that resolves SVG selection, hit-testing, coordsAtPos, and probes.
 */
export function createSvgGeometryProvider(
  options: CreateSvgGeometryProviderOptions
): SvgGeometryProvider {
  const measurements = traceQuireViewPhase(
    options.trace,
    "svg-browser-measure:collect",
    () => collectSvgTextMeasurements(options)
  );

  /**
   * Resolves selection geometry from the collected SVG text measurements.
   *
   * @param selectionOptions - Optional render result and trace override.
   * @returns SVG-measured selection geometry, or the retained geometry.
   */
  function resolveSelectionGeometry(
    selectionOptions?: SvgGeometryProviderSelectionOptions
  ): QuireSelectionGeometry {
    const renderResult = selectionOptions?.renderResult ?? options.renderResult;
    const trace = selectionOptions === undefined
      ? options.trace
      : selectionOptions.trace;

    return traceQuireViewPhase(
      trace,
      "svg-browser-measure:selection",
      () => measurements.length === 0
        ? renderResult.selectionGeometry
        : buildSvgMeasuredSelectionGeometry(
          renderResult.selectionGeometry,
          measurements
        )
    );
  }

  /**
   * Hit-tests rendered SVG text through the collected measurements.
   *
   * @param hitOptions - Client point and projection inputs.
   * @returns Browser-measured text hit, or the retained hit.
   */
  function hitTest(
    hitOptions: SvgGeometryProviderHitTestOptions
  ): QuireHitTestResult {
    return hitTestSvgBrowserMeasurements(
      measurements,
      hitOptions
    );
  }

  /**
   * Refines a retained document-position rectangle with SVG measurements.
   *
   * @param coordsOptions - Document position, retained geometry, and projection inputs.
   * @returns Browser-measured client rectangle scoped by shared retained geometry.
   */
  function refineCoordsAtPos(
    coordsOptions: SvgGeometryProviderCoordsAtPosOptions
  ): QuireViewCoordsAtPosResult {
    return resolveSvgBrowserMeasurementsCoordsAtPos(
      measurements,
      coordsOptions
    );
  }

  /**
   * Runs browser-native width reads over the collected visible text.
   *
   * @returns Summary of browser-native width reads performed by this probe.
   */
  function runWidthProbe(): SvgBrowserTextWidthProbeReport {
    return traceQuireViewPhase(
      options.trace,
      "svg-browser-measure:width-probe",
      () => runSvgBrowserTextWidthProbe(measurements)
    );
  }

  return {
    measurements,
    resolveSelectionGeometry,
    hitTest,
    refineCoordsAtPos,
    runWidthProbe
  };
}
