import type {
  SvgBrowserTextWidthProbeReport,
  SvgTextMeasurement
} from "./types";

/**
 * Runs diagnostic browser-native width reads over measured SVG text nodes.
 *
 * @param measurements - Collected rendered SVG text measurements.
 * @returns Summary of browser-native width reads performed by this probe.
 */
export function runSvgBrowserTextWidthProbe(
  measurements: readonly SvgTextMeasurement[]
): SvgBrowserTextWidthProbeReport {
  let characterCount = 0;
  let textLengthReads = 0;
  let subStringLengthReads = 0;

  for (const measurement of measurements) {
    characterCount += measurement.command.text.length;
    void measurement.resolveTextLength();
    textLengthReads += 1;

    if (measurement.command.text.length > 0) {
      void measurement.resolveSubStringLength(0, measurement.command.text.length);
      subStringLengthReads += 1;
    }
  }

  return {
    textNodeCount: measurements.length,
    characterCount,
    textLengthReads,
    subStringLengthReads
  };
}
