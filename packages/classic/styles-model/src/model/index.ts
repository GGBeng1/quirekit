export {
  createDefaultWordParagraphStyleRegistry,
  defaultWordBodyStyleId,
  defaultWordStyleSelectorHeadingLevels,
  defaultWordSubtitleStyleId,
  defaultWordTitleStyleId
} from "./defaults";
export {
  resolveWordNamedParagraphStyle,
  resolveWordParagraphAppearance,
  resolveWordTableCellParagraphAppearance
} from "./resolve";
export { mergeWordParagraphFormatting } from "./merge";
export { collectWordParagraphStyleConsumerIds } from "./consumers";
export { collectWordStyleNumberingReferences } from "./numbering";
export { resolveWordParagraphStyleRegistry } from "./registry";
export { createWordParagraphStyleSelectorItems } from "./selector";
export type {
  ResolvedWordNamedParagraphStyle,
  ResolvedWordParagraphAppearance,
  ResolvedWordStyleNumbering,
  WordNamedParagraphStyle,
  WordNamedParagraphStylePreservation,
  WordNamedParagraphStyleRole,
  WordParagraphStyleDiagnostic,
  WordParagraphStyleDiagnosticKind,
  WordParagraphStyleDefinitionRevisionSource,
  WordParagraphStyleRegistry,
  WordParagraphTextDefaults,
  WordParagraphStyleRevisionMemberKind,
  WordParagraphStyleSelectorItem,
  WordParagraphStyleSelectorRole,
  WordStyleNumberingReference,
  WordTableStyleTextLayer
} from "./types";
export {
  isWordNamedParagraphStyle,
  isWordParagraphStyleRegistry
} from "./validation";

export { resolveWordNamedCharacterStyle } from "./character";
export { mergeWordStyleText } from "./text/merge";
export type { WordStyleTextProperties, WordStyleToggle, WordStyleFontReferences, WordStyleColorReference } from "./text/types";
export type { WordNamedCharacterStyle } from "./types";

export { composeWordStyleText } from "./text/compose";

export { collectWordStyleCompatibilityDiagnostics } from "./compatibility";
export { resolveWordDocumentStyleRegistry } from "./theme/context";
export { normalizeWordStyleTextEdit } from "./text/edit";
