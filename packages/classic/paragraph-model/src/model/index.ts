export {
  createWordParagraphCharacterMeasurement,
  createWordParagraphDxaMeasurement,
  defaultWordParagraphCharacterPitchTwips,
  defaultWordParagraphFormatting,
  resolveWordParagraphFormatting,
  resolveWordParagraphIndentation,
  wordParagraphMeasurementToTwips
} from "./measurement";
export {
  resolveWordParagraphBlockSpacing,
  resolveWordParagraphLineMetrics
} from "./spacing";
export type {
  ResolvedWordParagraphBlockSpacing,
  ResolvedWordParagraphLineMetrics,
  WordParagraphLineHeightMode
} from "./spacing";
export {
  defaultWordHeadingStyleId,
  resolveWordHeadingLevel,
  resolveWordHeadingStyleLevel,
  wordHeadingCanvasFontScales
} from "./heading";
export type { WordHeadingLevel } from "./heading";
