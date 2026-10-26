import type { QuireProseMirrorBlockInputOptions } from "../../types";
import type { ResolveQuireTextblockShapingSourceOptions, QuireTextblockShapingSource } from "../source";
import type { ShapeTextblockFragmentsRequest } from "./types";

/**
 * Keeps full and retained-tail shaping on the same effective source geometry.
 * @param source - Profile-resolved source, styles and paragraph policies.
 * @returns Source fields admitted by both shaping paths, without opaque Word tokens.
 */
export function projectTextblockShapeSource(source: QuireTextblockShapingSource): Pick<ShapeTextblockFragmentsRequest,
  "runs" | "sourceAnchors" | "sourceCapabilities" | "metrics" | "baseDirection" | "alignment" | "tabs" | "avoidPunctuationBreaks" | "autoSpacing"> {
  return {
    runs: source.runs, sourceAnchors: source.sourceAnchors, sourceCapabilities: source.sourceCapabilities,
    metrics: source.metrics, baseDirection: source.baseDirection, alignment: source.alignment,
    tabs: source.paragraphFormatting.tabs, avoidPunctuationBreaks: source.paragraphFormatting.avoidPunctuationBreaks,
    autoSpacing: source.paragraphFormatting.autoSpacing
  };
}

/**
 * Projects identical source authorities for complete and retained-tail shaping.
 * @param source - Textblock identity and absolute source range.
 * @param options - Resolved document and section capabilities.
 * @returns Source resolver inputs with the original optional-field presence.
 */
export function projectTextblockSourceOptions(
  source: Pick<ResolveQuireTextblockShapingSourceOptions, "node" | "contentStart" | "contentEnd" | "sourceId">,
  options: QuireProseMirrorBlockInputOptions
): ResolveQuireTextblockShapingSourceOptions {
  return {
    ...source,
    font: options.font,
    ...(options.documentFontTheme === undefined
      ? {}
      : { documentFontTheme: options.documentFontTheme }),
    ...(options.documentFontTable === undefined
      ? {}
      : { documentFontTable: options.documentFontTable }),
    lineHeight: options.lineHeight,
    textBaselineOffset: options.textBaselineOffset,
    textMeasurer: options.textMeasurer,
    hiddenTextViewMode: options.hiddenTextViewMode ?? "normal",
    ...(options.lineGrid === undefined ? {} : { lineGrid: options.lineGrid }),
    ...(options.characterGrid === undefined ? {} : { characterGrid: options.characterGrid }),
    paragraphModel: options.paragraphModel,
    paragraphStyleContext: options.paragraphStyleContext,
    ...(options.insideWordTableCell === undefined ? {} : {
      insideWordTableCell: options.insideWordTableCell,
      wordTableCellStyleLayer: options.wordTableCellStyleLayer
    }),
    ...(options.sourceCapabilityRegistry === undefined
      ? {}
      : { sourceCapabilityRegistry: options.sourceCapabilityRegistry }),
    ...(options.resolveNodeQuireTextStyle === undefined
      ? {}
      : { resolveNodeQuireTextStyle: options.resolveNodeQuireTextStyle }),
    ...(options.resolveMarkQuireStyle === undefined
      ? {}
      : { resolveMarkQuireStyle: options.resolveMarkQuireStyle })
  };
}
