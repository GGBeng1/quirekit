import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { WordStyleTextProperties } from "./text/types";
import type {
  WordHeadingLevel,
  WordParagraphFormatting,
  WordParagraphFormattingPatch
} from "@quirekit/classic-paragraph-model";

/** Semantic product role assigned to one named Word paragraph style. */
export type WordNamedParagraphStyleRole =
  | "body"
  | "title"
  | "subtitle"
  | "heading"
  | "custom";

/**
 * Style-level `w:numPr` reference; each field inherits independently through `basedOn`.
 * Import projects it from the preserved `pPr`, which stays the export authority.
 */
export interface WordStyleNumberingReference {
  /** Concrete numbering instance id; `"0"` removes numbering inherited from base styles. */
  readonly numId: string | null;
  /** Zero-based level, or null to inherit and finally default to level zero. */
  readonly level: number | null;
}

/** Numbering produced by resolving one style inheritance chain. */
export interface ResolvedWordStyleNumbering {
  /** Concrete numbering instance id. */
  readonly numId: string;
  /** Zero-based numbering level. */
  readonly level: number;
  /** Leaf-most style in the chain that declared `numPr`; it and its descendants outrank level indentation. */
  readonly sourceStyleId: string;
}

/** Source fields retained for round-trip behavior outside the modeled subset. */
export interface WordNamedParagraphStylePreservation {
  /** Unknown OOXML style attributes and child fields keyed by canonical name. */
  readonly ooxml?: Readonly<Record<string, unknown>> | null | undefined;
  /** Unknown LitAST style fields keyed by canonical name. */
  readonly litAst?: Readonly<Record<string, unknown>> | null | undefined;
}

/** One Word-compatible named paragraph style definition. */
export interface WordNamedParagraphStyle {
  /** Stable style identifier referenced by paragraph `styleId` values. */
  readonly id: string;
  /** Product-visible localized or imported style name. */
  readonly name: string;
  /** Semantic role used by compact product selectors. */
  readonly role: WordNamedParagraphStyleRole;
  /** Heading level from one through nine, or null for non-heading styles. */
  readonly headingLevel: WordHeadingLevel | null;
  /** Parent style identifier used for inherited paragraph and text properties. */
  readonly basedOn: string | null;
  /** Style applied to a newly inserted paragraph after Enter. */
  readonly next: string | null;
  /** Linked character-style identifier retained for OOXML fidelity. */
  readonly link: string | null;
  /** Whether this is the default paragraph style. */
  readonly default: boolean;
  /** Whether the style is exposed in quick-format galleries. */
  readonly quickFormat: boolean;
  /** Stable gallery order compatible with OOXML `uiPriority`. */
  readonly uiPriority: number | null;
  /** Whether ordinary style galleries should hide the style. */
  readonly hidden: boolean;
  /** Whether the style stays hidden until explicitly used. */
  readonly semiHidden: boolean;
  /** Whether using the style makes a semi-hidden style visible. */
  readonly unhideWhenUsed: boolean;
  /** Whether product surfaces should reject mutations to the style. */
  readonly locked: boolean;
  /** Paragraph property delta contributed by the style. */
  readonly paragraph: WordParagraphFormattingPatch;
  /** Renderer-neutral text metric delta contributed by the style. */
  readonly text: WordStyleTextProperties;
  /** Lossless source fields outside the current first-class subset. */
  readonly preservation: WordNamedParagraphStylePreservation | null;
  /** Style-level numbering reference, absent when the style declares no `numPr`. */
  readonly numbering?: WordStyleNumberingReference | null | undefined;
}

/** Modeled run defaults; other document character properties retain their source authority. */
export type WordParagraphTextDefaults = WordStyleTextProperties;

/** Document-level named paragraph style registry. */
export interface WordParagraphStyleRegistry {
  /** Version of fully owned run deltas; absent legacy records retain unmodeled source fields. */
  readonly textPropertiesVersion?: 1;
  /** Named character styles; absent in legacy document snapshots. */
  readonly characterStyles?: Readonly<Record<string, WordNamedCharacterStyle>>;
  /** Default character identity, or null when the document declares none. */
  readonly defaultCharacterStyleId?: string | null;
  /** Independent language and emphasis defaults applied before every named style. */
  readonly textDefaults?: WordParagraphTextDefaults | undefined;
  /** Document default delta applied before every named style, including independent roots. */
  readonly paragraphDefaults?: WordParagraphFormattingPatch | undefined;
  /** Default paragraph style identifier used when a paragraph has no style id. */
  readonly defaultParagraphStyleId: string;
  /** Named paragraph styles keyed by stable style identifier. */
  readonly styles: Readonly<Record<string, WordNamedParagraphStyle>>;
}

/** Named character definition; paragraph-only properties cannot be assigned here. */
export interface WordNamedCharacterStyle extends Omit<WordNamedParagraphStyle, "role" | "headingLevel" | "paragraph" | "next" | "numbering"> {
  /** Discriminator for public style inventories. */
  readonly kind: "character";
}

/** One OOXML property family participating in a style-definition revision. */
export type WordParagraphStyleRevisionMemberKind =
  | "paragraph-properties"
  | "run-properties";

/** Imported source action that changed one named paragraph-style definition. */
export interface WordParagraphStyleDefinitionRevisionSource {
  /** Package part whose local annotation namespace owns the source id. */
  readonly partName: "/word/styles.xml";
  /** Producer annotation id, or null for malformed-but-preserved source. */
  readonly sourceId: string | null;
  /** Producer author display name. */
  readonly reviewerName: string;
  /** Producer timestamp, or null when omitted. */
  readonly createdAt: string | null;
  /** Named paragraph style changed by this source action. */
  readonly styleId: string;
  /** Product-visible style name captured at import. */
  readonly styleName: string;
  /** Complete canonical style state before the source action. */
  readonly before: WordNamedParagraphStyle;
  /** Complete canonical current style state after the source action. */
  readonly after: WordNamedParagraphStyle;
  /** Stable leaf paths changed in the modeled paragraph/text state. */
  readonly changedFields: readonly string[];
  /** Property-family members merged into this source action. */
  readonly memberKinds: readonly WordParagraphStyleRevisionMemberKind[];
}

/** Diagnostic kinds produced while resolving one named style chain. */
export type WordParagraphStyleDiagnosticKind =
  | "missing-style"
  | "missing-base"
  | "inheritance-cycle"
  | "preserved-format";

/** One recoverable named-style resolution diagnostic. */
export interface WordParagraphStyleDiagnostic {
  /** Stable diagnostic kind for product and import reports. */
  readonly kind: WordParagraphStyleDiagnosticKind;
  /** Style identifier that caused the diagnostic. */
  readonly styleId: string;
  /** Human-readable diagnostic detail. */
  readonly message: string;
}

/**
 * Table-style layer for paragraphs inside a styled table cell. It applies after
 * document defaults and before the paragraph style chain.
 */
export interface WordTableStyleTextLayer {
  /** Paragraph delta contributed by the table style for this cell. */
  readonly paragraph?: WordParagraphFormattingPatch | null | undefined;
  /** Text delta contributed by the table style for this cell. */
  readonly text?: WordStyleTextProperties | null | undefined;
}

/** Effective properties resolved from one named style inheritance chain. */
export interface ResolvedWordNamedParagraphStyle {
  /** Requested style definition, or the registry default when omitted. */
  readonly style: WordNamedParagraphStyle;
  /** Base-to-leaf style identifiers that contributed properties. */
  readonly inheritanceChain: readonly string[];
  /** Effective paragraph formatting produced by the style chain. */
  readonly paragraph: WordParagraphFormatting;
  /** Effective renderer-neutral text metric delta. */
  readonly text: QuireNodeCanvasTextStyle;
  /** Effective style numbering, or null when the chain declares none or removes it. */
  readonly numbering: ResolvedWordStyleNumbering | null;
  /** Recoverable missing-reference and cycle diagnostics. */
  readonly diagnostics: readonly WordParagraphStyleDiagnostic[];
}

/** Effective style plus paragraph-local direct formatting. */
export interface ResolvedWordParagraphAppearance {
  /** Effective named style resolution. */
  readonly namedStyle: ResolvedWordNamedParagraphStyle;
  /** Effective paragraph properties after direct formatting wins. */
  readonly paragraph: WordParagraphFormatting;
  /** Effective renderer-neutral text metric delta from the named style. */
  readonly text: QuireNodeCanvasTextStyle;
}

/** Compact selector inventory role supported by the standard Classic surface. */
export type WordParagraphStyleSelectorRole =
  | "body"
  | "title"
  | "subtitle"
  | "heading";

/** One compact named paragraph style selector entry. */
export interface WordParagraphStyleSelectorItem {
  /** Stable style identifier used by apply-style commands. */
  readonly styleId: string;
  /** Product-visible style name. */
  readonly name: string;
  /** Semantic selector role. */
  readonly role: WordParagraphStyleSelectorRole;
  /** Heading level for heading entries, otherwise null. */
  readonly headingLevel: WordHeadingLevel | null;
  /** Stable gallery order. */
  readonly uiPriority: number;
}
