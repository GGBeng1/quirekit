import * as hb from "harfbuzzjs";
import type { QuireShapeRunOptions, QuireTextShapeDirection } from "./types";
import type { QuireOpenTypeFeature } from "./types";

/**
 * Creates and prepares a HarfBuzz buffer for one run.
 *
 * @param options - Run text and optional segmentation data.
 * @returns Prepared HarfBuzz buffer.
 */
export function createHarfBuzzBuffer(options: QuireShapeRunOptions): hb.Buffer {
  const buffer = new hb.Buffer();
  buffer.addText(options.text);
  buffer.setClusterLevel(hb.ClusterLevel.MONOTONE_CHARACTERS);
  buffer.guessSegmentProperties();

  const direction = toHarfBuzzDirection(options.direction);

  if (direction) {
    buffer.setDirection(direction);
  }

  if (options.script) {
    buffer.setScript(toHarfBuzzScript(options.script));
  }

  if (options.language) {
    buffer.setLanguage(options.language);
  }

  return buffer;
}

/**
 * Resolves the direction stored on output clusters.
 *
 * @param direction - QuireKit run direction.
 * @returns Explicit LTR/RTL direction when known.
 */
export function resolveReportedClusterDirection(
  direction: QuireTextShapeDirection | undefined
): "ltr" | "rtl" | undefined {
  return direction === "ltr" || direction === "rtl" ? direction : undefined;
}

/**
 * Converts QuireKit OpenType feature records to HarfBuzz features.
 *
 * @param features - Feature records supplied by layout or editor style.
 * @returns HarfBuzz feature records.
 */
export function toHarfBuzzFeatures(
  features: readonly QuireOpenTypeFeature[] | undefined
): hb.Feature[] {
  return (features ?? []).map((feature) => new hb.Feature(
    feature.tag,
    typeof feature.value === "boolean" ? Number(feature.value) : feature.value,
    feature.start ?? hb.Feature.GLOBAL_START,
    feature.end ?? hb.Feature.GLOBAL_END
  ));
}

/**
 * Converts a QuireKit direction option to a HarfBuzz direction value.
 *
 * @param direction - QuireKit run direction.
 * @returns HarfBuzz direction, or null when the buffer should guess.
 */
function toHarfBuzzDirection(
  direction: QuireTextShapeDirection | undefined
): hb.Direction | null {
  if (direction === "ltr") {
    return hb.Direction.LTR;
  }

  if (direction === "rtl") {
    return hb.Direction.RTL;
  }

  return null;
}

/**
 * Converts an OpenType script tag to the string HarfBuzz expects.
 *
 * @param script - Script tag or HarfBuzz script string.
 * @returns HarfBuzz script string.
 */
function toHarfBuzzScript(script: string): string {
  return script.length === 4 ? hb.otTagToScript(script) : script;
}

