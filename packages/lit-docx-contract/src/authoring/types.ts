import type { LitAstMark, LitAstNode } from "../core/contracts.js";
import type { DocxRubyInput } from "../core/ruby/types.js";
import type { DocxRoundTripMetadata } from "../round-trip/types.js";
import type {
  DocxCodecDiagnosticInput,
  DocxFieldCapabilityEvidence,
  DocxLossDisposition,
  DocxMarkAttributeCodec,
  DocxMarkAttributeExportContext,
  DocxMarkAttributeImportContext,
  DocxMarkCodec,
  DocxMarkImportContext,
  DocxMarkExportContext,
  DocxNodeCodec,
  DocxNodeExportContext,
  DocxNodeImportContext
} from "../compiler/contributions/index.js";
import type {
  DocxRelationshipPlan,
  DocxResourcePlan
} from "../compiler/products/index.js";

/** Paragraph alignment accepted by the semantic authoring facade. */
export type DocxParagraphAlignment =
  | "left"
  | "center"
  | "right"
  | "justify";

/** One typed paragraph or table border. */
export interface DocxBorder {
  /** Additional compatible border fields retained by advanced callers. */
  readonly [name: string]: unknown;
  /** OOXML-compatible border style token. */
  readonly val: string;
  /** Normalized RGB token or `auto`. */
  readonly color?: string | undefined;
  /** Border width in eighths of a point. */
  readonly sz?: number | undefined;
  /** Spacing outside the border in points. */
  readonly space?: number | undefined;
}

/** Complete shading value used by runs, paragraphs, or cells. */
export interface DocxShading {
  /** Additional compatible shading fields retained by advanced callers. */
  readonly [name: string]: unknown;
  /** Shading pattern, normally `clear`. */
  readonly val: string;
  /** Optional foreground color. */
  readonly color?: string | undefined;
  /** Optional background fill. */
  readonly fill?: string | undefined;
}

/** Paragraph spacing expressed in twentieths of a point. */
export interface DocxSpacing {
  /** Paragraph space before in hundredths of a line. */
  readonly beforeLines?: number | undefined;
  /** Whether the producer computes paragraph space before automatically. */
  readonly beforeAutospacing?: boolean | undefined;
  /** Paragraph space after in hundredths of a line. */
  readonly afterLines?: number | undefined;
  /** Whether the producer computes paragraph space after automatically. */
  readonly afterAutospacing?: boolean | undefined;
  /** Space before the paragraph. */
  readonly before?: number | undefined;
  /** Space after the paragraph. */
  readonly after?: number | undefined;
  /** Line-spacing value. */
  readonly line?: number | undefined;
  /** Line-spacing interpretation. */
  readonly lineRule?: "auto" | "atLeast" | "exact" | undefined;
}

/** Logical paragraph indentation expressed in twentieths of a point. */
export interface DocxIndentation {
  /** Left indentation. */
  readonly left?: number | undefined;
  /** Right indentation. */
  readonly right?: number | undefined;
  /** First-line indentation. */
  readonly firstLine?: number | undefined;
  /** Hanging indentation. */
  readonly hanging?: number | undefined;
  /** Left indentation in character units. */
  readonly leftChars?: number | undefined;
  /** Right indentation in character units. */
  readonly rightChars?: number | undefined;
  /** First-line indentation in character units. */
  readonly firstLineChars?: number | undefined;
  /** Hanging indentation in character units. */
  readonly hangingChars?: number | undefined;
}

/** Run properties represented by the portable `textStyle` mark. */
export interface DocxRunProperties {
  /** Additional compatible text-style fields retained by advanced callers. */
  readonly [name: string]: unknown;
  /** Font size such as `12pt`, or a point value. */
  readonly fontSize?: string | number | undefined;
  /** Complex-script font size such as `12pt`, or a point value. */
  readonly fontSizeComplexScript?: string | number | undefined;
  /** Text RGB color. */
  readonly color?: string | undefined;
  /** Primary font family. */
  readonly fontFamily?: string | undefined;
  /** East Asian font family. */
  readonly fontFamilyEastAsia?: string | undefined;
  /** Complex-script font family. */
  readonly fontFamilyComplexScript?: string | undefined;
  /** Run background fill. */
  readonly backgroundColor?: string | undefined;
  /** Whether the run uses all capitals. */
  readonly allCaps?: boolean | undefined;
  /** Whether the run uses small capitals. */
  readonly smallCaps?: boolean | undefined;
  /** Character spacing such as `0.5pt`. */
  readonly letterSpacing?: string | number | undefined;
  /** Complex-script-only bold state, including explicit false. */
  readonly boldCs?: boolean | undefined;
  /** Complex-script-only italic state, including explicit false. */
  readonly italicCs?: boolean | undefined;
  /** Word-compatible emphasis-mark kind, including explicit `none`. */
  readonly emphasisMark?: "none" | "dot" | "comma" | "circle" | "underDot" | undefined;
}

/** Paragraph properties accepted by block builders. */
export interface DocxParagraphProperties {
  /** Additional compatible paragraph fields retained by advanced callers. */
  readonly [name: string]: unknown;
  /** Named paragraph style id. */
  readonly styleId?: string | undefined;
  /** Zero-based outline level. */
  readonly outlineLevel?: number | undefined;
  /** Text alignment. */
  readonly textAlign?: DocxParagraphAlignment | undefined;
  /** Paragraph spacing. */
  readonly spacing?: DocxSpacing | undefined;
  /** Paragraph indentation. */
  readonly indent?: DocxIndentation | undefined;
  /** Paragraph borders keyed by OOXML side. */
  readonly borders?: Readonly<Record<string, DocxBorder>> | undefined;
  /** Paragraph shading. */
  readonly shading?: DocxShading | undefined;
  /** Whether the next paragraph stays on the same page. */
  readonly keepNext?: boolean | undefined;
  /** Whether paragraph lines stay on the same page. */
  readonly keepLines?: boolean | undefined;
  /** Whether the paragraph starts a new page. */
  readonly pageBreakBefore?: boolean | undefined;
}

/** Options for a semantic paragraph. */
export interface DocxParagraphOptions {
  /** Inline children in source order. */
  readonly children?: readonly LitAstNode[] | undefined;
  /** Optional paragraph properties. */
  readonly properties?: DocxParagraphProperties | undefined;
}

/** Options for a semantic heading. */
export interface DocxHeadingOptions extends DocxParagraphOptions {
  /** Heading level from one through six. */
  readonly level: 1 | 2 | 3 | 4 | 5 | 6;
}

/** Options for a semantic blockquote. */
export interface DocxBlockquoteOptions {
  /** Block children in source order. */
  readonly children: readonly LitAstNode[];
}

/** Options for a semantic code block. */
export interface DocxCodeBlockOptions {
  /** Code text when children are not supplied. */
  readonly text?: string | undefined;
  /** Optional text children preserving explicit line breaks. */
  readonly children?: readonly LitAstNode[] | undefined;
  /** Optional language token retained by the code-block style. */
  readonly language?: string | undefined;
  /** Optional explicit style id. */
  readonly styleId?: string | undefined;
}

/** Options shared by tagged block and inline containers. */
export interface DocxTaggedContainerOptions {
  /** Stable extension-defined content-control tag. */
  readonly tag: string;
  /** Optional user-facing content-control alias. */
  readonly alias?: string | undefined;
  /** Legal fallback content in source order. */
  readonly children: readonly LitAstNode[];
  /** Optional feature metadata, restored only while the visible fallback is unchanged. */
  readonly metadata?: DocxRoundTripMetadata | undefined;
  /** Permit document-wide budget checks to omit recovery metadata while retaining visible content. */
  readonly metadataOptional?: boolean | undefined;
}

/** Options for the standard callout recipe. */
export interface DocxCalloutOptions {
  /** Block content retained inside the callout. */
  readonly children: readonly LitAstNode[];
  /** Cell fill, defaulting to a light neutral tone. */
  readonly fill?: string | undefined;
  /** Optional cell border. */
  readonly border?: DocxBorder | undefined;
}

/** Options for one authored text node. */
export interface DocxTextOptions {
  /** Inline marks applied in declared order. */
  readonly marks?: readonly LitAstMark[] | undefined;
}

/** Options for one authored link. */
export interface DocxLinkOptions extends DocxTextOptions {
  /** External URL or `#bookmark` target. */
  readonly href: string;
  /** Optional link title. */
  readonly title?: string | undefined;
  /** Optional relationship target hint. */
  readonly target?: string | undefined;
}

/** Options for a semantic link mark. */
export interface DocxLinkMarkOptions {
  /** External URL or `#bookmark` target. */
  readonly href: string;
  /** Optional link title. */
  readonly title?: string | undefined;
  /** Optional relationship target hint. */
  readonly target?: string | undefined;
}

/** Explicit OOXML table-width measurement. */
export interface DocxTableWidth {
  /** Numeric width in the unit selected by `type`. */
  readonly value: number;
  /** OOXML table-width unit. Percentage values use fiftieths of a percent. */
  readonly type: "auto" | "dxa" | "nil" | "pct";
}

/** Absolute dxa shorthand or an explicitly typed table width. */
export type DocxTableMeasurement = number | DocxTableWidth;

/** Options for one semantic table. */
export interface DocxTableOptions {
  /** Rows in source order. */
  readonly rows: readonly LitAstNode[];
  /** Optional table width as dxa shorthand or an explicit OOXML measurement. */
  readonly width?: DocxTableMeasurement | undefined;
  /** Optional fixed or automatic layout. */
  readonly layout?: "fixed" | "auto" | undefined;
  /** Optional grid column widths. */
  readonly columns?: readonly number[] | undefined;
}

/** Options for one semantic table row. */
export interface DocxTableRowOptions {
  /** Cells in source order. */
  readonly cells: readonly LitAstNode[];
  /** Whether the row repeats as a header. */
  readonly isHeader?: boolean | undefined;
  /** Optional row height in twentieths of a point. */
  readonly height?: number | undefined;
  /** Whether the row may split across pages. */
  readonly cantSplit?: boolean | undefined;
}

/** Options for one semantic table cell. */
export interface DocxTableCellOptions {
  /** Block content in source order. */
  readonly children?: readonly LitAstNode[] | undefined;
  /** Horizontal grid span. */
  readonly colspan?: number | undefined;
  /** Vertical row span. */
  readonly rowspan?: number | undefined;
  /** Optional cell width as dxa shorthand or an explicit OOXML measurement. */
  readonly width?: DocxTableMeasurement | undefined;
  /** Optional cell shading. */
  readonly shading?: DocxShading | undefined;
  /** Optional cell borders. */
  readonly borders?: Readonly<Record<string, DocxBorder>> | undefined;
  /** Optional vertical alignment. */
  readonly verticalAlign?: "top" | "center" | "bottom" | undefined;
}

/** Options for a shaded table cell. */
export interface DocxShadedCellOptions extends DocxTableCellOptions {
  /** Required cell fill. */
  readonly fill: string;
}

/** Options for the one-cell table-container recipe. */
export interface DocxSingleCellContainerOptions {
  /** Block content retained by the container. */
  readonly children: readonly LitAstNode[];
  /** Optional cell shading. */
  readonly shading?: DocxShading | undefined;
  /** Optional cell border applied to all sides. */
  readonly border?: DocxBorder | undefined;
  /** Optional table width as dxa shorthand or an explicit OOXML measurement. */
  readonly width?: DocxTableMeasurement | undefined;
}

/** Standard diagnostic selected by a fallback or lossy codec decision. */
export interface DocxAuthoringDiagnostic {
  /** Stable machine-readable code. */
  readonly code: string;
  /** Human-readable loss explanation. */
  readonly message: string;
  /** Diagnostic severity, defaulting to warning. */
  readonly severity?: DocxCodecDiagnosticInput["severity"] | undefined;
  /** Loss disposition, defaulting to approximated. */
  readonly disposition?: DocxLossDisposition | undefined;
}

/** Options shared by fallback operations. */
export interface DocxFallbackOptions {
  /** Explicit diagnostic, or the codec definition's default diagnostic. */
  readonly diagnostic?: DocxAuthoringDiagnostic | undefined;
}

/** Options for shaded-table fallback. */
export interface DocxShadedTableFallbackOptions extends DocxFallbackOptions {
  /** Content retained in the fallback cell. */
  readonly children: readonly LitAstNode[];
  /** Cell fill. */
  readonly fill?: string | undefined;
  /** Optional cell border. */
  readonly border?: DocxBorder | undefined;
}

/** Options for image fallback. */
export interface DocxImageFallbackOptions extends DocxFallbackOptions {
  /** Caller-resolved image node options. */
  readonly image: DocxImageOptions;
}

/** Options for one authored image node or image resource. */
export interface DocxImageOptions {
  /** Stable source URL or asset identifier. */
  readonly src?: string | undefined;
  /** Browser-safe image bytes. */
  readonly data?: Uint8Array | undefined;
  /** Image MIME type. */
  readonly mediaType?: string | undefined;
  /** Width in CSS pixels. */
  readonly width: number;
  /** Height in CSS pixels. */
  readonly height: number;
  /** Accessible alternative text. */
  readonly alt: string;
  /** Optional deterministic semantic key. */
  readonly key?: string | undefined;
}

/** Loss declaration used by high-level codec definitions. */
export interface DocxCodecDirectionDecision
  extends DocxFieldCapabilityEvidence {
  /** Loss disposition for this conversion direction. */
  readonly disposition: DocxLossDisposition;
  /** Default runtime diagnostic for facade fallback operations. */
  readonly diagnostic?: DocxAuthoringDiagnostic | undefined;
}

/** Per-field loss decisions for a complex high-level codec. */
export interface DocxCodecFieldCapabilityOptions {
  /** Exact model field owned by this codec. */
  readonly field: string;
  /** Optional import decision overriding the codec default. */
  readonly import?: DocxCodecDirectionDecision | undefined;
  /** Optional export decision overriding the codec default. */
  readonly export?: DocxCodecDirectionDecision | undefined;
}

/** Shared capability declaration for a high-level codec. */
export interface DocxCodecCapabilityOptions {
  /** Model fields owned in addition to `$type`. */
  readonly fields?: readonly (
    string | DocxCodecFieldCapabilityOptions
  )[] | undefined;
  /** Import loss decision, defaulting to native when import exists. */
  readonly import?: DocxCodecDirectionDecision | undefined;
  /** Export loss decision, defaulting to native when export exists. */
  readonly export?: DocxCodecDirectionDecision | undefined;
}

/** Additional model node type one importer may create. */
export interface DocxCreatedModelType {
  /** Exact created model node type. */
  readonly modelType: string;
  /** Optional import capability owned here rather than by another codec. */
  readonly capability?: DocxCodecDirectionDecision | undefined;
}

/** Semantic selector for one shared LitAST node family. */
export interface DocxNodeImportSource {
  /** Underlying LitAST node type hidden by the semantic selector. */
  readonly nodeType: string;
  /**
   * Tests whether one candidate belongs to the semantic source.
   *
   * @param node - Candidate LitAST node.
   * @returns Whether the source selector owns the node.
   */
  readonly matches: (node: LitAstNode) => boolean;
}

/** High-level node import definition. */
export interface DocxNodeImportDefinition<ModelNode, ModelMark> {
  /** Generic semantic fallback, superseded by a matching specialized importer. */
  readonly fallback?: boolean | undefined;
  /** Claimed LitAST node type or types. */
  readonly from:
    | string
    | DocxNodeImportSource
    | readonly (string | DocxNodeImportSource)[];
  /** Additional model node types this importer may create. */
  readonly creates?: readonly (
    string | DocxCreatedModelType
  )[] | undefined;
  /** Optional recursive child category. */
  readonly childContentKind?: "block" | "inline" | undefined;
  /** Imports one claimed LitAST node. */
  readonly convert: (
    context: DocxNodeImportContext<ModelNode, ModelMark>
  ) => readonly ModelNode[];
}

/** High-level node export definition. */
export interface DocxNodeExportDefinition<ModelNode, ModelMark> {
  /** Exports one claimed model node. */
  readonly convert: (
    context: DocxNodeExportContext<ModelNode, ModelMark>
  ) => readonly LitAstNode[];
}

/** High-level model-neutral node codec declaration. */
export interface DocxNodeDefinition<ModelNode, ModelMark = unknown> {
  /** Stable contribution id. */
  readonly id: string;
  /** Exact model node type. */
  readonly modelType: string;
  /** Optional import half. */
  readonly import?: DocxNodeImportDefinition<ModelNode, ModelMark> | undefined;
  /** Optional export half. */
  readonly export?: DocxNodeExportDefinition<ModelNode, ModelMark> | undefined;
  /** Model fields and directional loss decisions. */
  readonly capabilities?: DocxCodecCapabilityOptions | undefined;
  /** Contribution ids that must execute first. */
  readonly requires?: readonly string[] | undefined;
}

/** High-level mark import definition. */
export interface DocxMarkImportDefinition<ModelMark> {
  /** Claimed LitAST mark type or types. */
  readonly from: string | readonly string[];
  /** Imports one claimed LitAST mark. */
  readonly convert: (
    context: DocxMarkImportContext<ModelMark>
  ) => readonly ModelMark[];
}

/** High-level mark export definition. */
export interface DocxMarkExportDefinition<ModelMark> {
  /** Exports one claimed model mark. */
  readonly convert: (
    context: DocxMarkExportContext<ModelMark>
  ) => readonly LitAstMark[];
}

/** High-level model-neutral mark codec declaration. */
export interface DocxMarkDefinition<ModelMark> {
  /** Stable contribution id. */
  readonly id: string;
  /** Exact model mark type. */
  readonly modelType: string;
  /** Optional import half. */
  readonly import?: DocxMarkImportDefinition<ModelMark> | undefined;
  /** Optional export half. */
  readonly export?: DocxMarkExportDefinition<ModelMark> | undefined;
  /** Model fields and directional loss decisions. */
  readonly capabilities?: DocxCodecCapabilityOptions | undefined;
  /** Contribution ids that must execute first. */
  readonly requires?: readonly string[] | undefined;
}

/** Loss decisions available to one composable mark-attribute codec. */
export interface DocxMarkAttributeCapabilityOptions {
  /** Import loss decision, defaulting to native when import exists. */
  readonly import?: DocxCodecDirectionDecision | undefined;
  /** Export loss decision, defaulting to native when export exists. */
  readonly export?: DocxCodecDirectionDecision | undefined;
}

/** High-level import definition for selected attributes on a shared mark. */
export interface DocxMarkAttributeImportDefinition {
  /** Exact source LitAST mark type or types. */
  readonly from: string | readonly string[];
  /** Exact LitAST attribute names read by this conversion. */
  readonly sourceAttributes: readonly string[];
  /**
   * Imports the extension-owned model attribute fragment.
   *
   * @param context - Complete source attributes, path, services, and diagnostics.
   * @returns Fragment limited to the definition's model attributes.
   */
  readonly convert: (
    context: DocxMarkAttributeImportContext
  ) => Readonly<Record<string, unknown>>;
}

/** High-level export definition for selected attributes on a shared mark. */
export interface DocxMarkAttributeExportDefinition<ModelMark> {
  /** Exact target LitAST mark type or types. */
  readonly to: string | readonly string[];
  /** Exact LitAST attribute names created by this conversion. */
  readonly targetAttributes: readonly string[];
  /**
   * Exports the extension-owned LitAST attribute fragment.
   *
   * @param context - Complete model attributes, path, services, and diagnostics.
   * @returns Fragment limited to `targetAttributes`.
   */
  readonly convert: (
    context: DocxMarkAttributeExportContext<ModelMark>
  ) => Readonly<Record<string, unknown>>;
}

/** High-level composable attribute declaration for one shared model mark. */
export interface DocxMarkAttributeDefinition<ModelMark> {
  /** Stable contribution id. */
  readonly id: string;
  /** Exact shared model mark type. */
  readonly modelType: string;
  /** Exact extension-owned model attributes. */
  readonly modelAttributes: readonly string[];
  /** Optional LitAST-to-model attribute conversion. */
  readonly import?: DocxMarkAttributeImportDefinition | undefined;
  /** Optional model-to-LitAST attribute conversion. */
  readonly export?: DocxMarkAttributeExportDefinition<ModelMark> | undefined;
  /** Directional loss decisions for the owned model attributes. */
  readonly capabilities?: DocxMarkAttributeCapabilityOptions | undefined;
  /** Contribution ids that must execute first. */
  readonly requires?: readonly string[] | undefined;
}

/** Resource relationship kinds whose OOXML URI is facade-owned. */
export type DocxRelationshipKind =
  | "image"
  | "hyperlink"
  | "styles"
  | "numbering"
  | "header"
  | "footer";

/** Options for one semantic relationship request. */
export interface DocxRelationshipOptions {
  /** Stable relationship key. */
  readonly key: string;
  /** Relationship family. */
  readonly kind: DocxRelationshipKind;
  /** Semantic resource, package part, or external target. */
  readonly target: DocxResourcePlan | string;
  /** Source part, defaulting to the main document. */
  readonly sourcePart?: string | undefined;
  /** Whether the target is external. */
  readonly external?: boolean | undefined;
}

/** Options used to bind one facade instance to a conversion lifecycle. */
export interface DocxAuthoringApiOptions {
  /** Receives automatic fallback diagnostics. */
  readonly report?: ((diagnostic: DocxCodecDiagnosticInput) => void) | undefined;
  /** Codec-level fallback diagnostic used when an operation omits one. */
  readonly defaultDiagnostic?: DocxAuthoringDiagnostic | undefined;
}

/** High-level codec operation family. */
export interface DocxCodecApi {
  /** Defines one node codec with derived structural capability rows. */
  readonly node: <ModelNode, ModelMark = unknown>(
    definition: DocxNodeDefinition<ModelNode, ModelMark>
  ) => DocxNodeCodec<ModelNode, ModelMark>;
  /** Defines one mark codec with derived structural capability rows. */
  readonly mark: <ModelMark>(
    definition: DocxMarkDefinition<ModelMark>
  ) => DocxMarkCodec<ModelMark>;
  /** Defines a partial codec for extension-owned attributes on a shared mark. */
  readonly markAttributes: <ModelMark>(
    definition: DocxMarkAttributeDefinition<ModelMark>
  ) => DocxMarkAttributeCodec<ModelMark>;
}

/** Semantic block operation family. */
export interface DocxBlocksApi {
  /** Creates one paragraph. */
  readonly paragraph: (options?: DocxParagraphOptions) => LitAstNode;
  /** Creates one heading. */
  readonly heading: (options: DocxHeadingOptions) => LitAstNode;
  /** Creates one blockquote. */
  readonly blockquote: (options: DocxBlockquoteOptions) => LitAstNode;
  /** Creates one code block. */
  readonly codeBlock: (options: DocxCodeBlockOptions) => LitAstNode;
  /** Creates one page break. */
  readonly pageBreak: () => LitAstNode;
  /** Creates one tagged rich-text container. */
  readonly taggedContainer: (
    options: DocxTaggedContainerOptions
  ) => LitAstNode;
  /** Creates the standard one-cell-table callout recipe. */
  readonly callout: (options: DocxCalloutOptions) => LitAstNode;
}

/** Semantic table operation family. */
export interface DocxTablesApi {
  /** Creates one table. */
  readonly table: (options: DocxTableOptions) => LitAstNode;
  /** Creates one table row. */
  readonly row: (options: DocxTableRowOptions) => LitAstNode;
  /** Creates one table cell. */
  readonly cell: (options?: DocxTableCellOptions) => LitAstNode;
  /** Creates one shaded table cell. */
  readonly shadedCell: (options: DocxShadedCellOptions) => LitAstNode;
  /** Creates a one-row, one-cell table container. */
  readonly singleCellContainer: (
    options: DocxSingleCellContainerOptions
  ) => LitAstNode;
}

/** Semantic inline operation family. */
export interface DocxInlineApi {
  /** @param options - Independent base/annotation runs and explicit OOXML properties. @returns Native phonetic-guide node. */
  readonly ruby: (options: DocxRubyInput) => LitAstNode;
  /** Creates one text node. */
  readonly text: (text: string, options?: DocxTextOptions) => LitAstNode;
  /** Creates linked text without exposing the underlying mark representation. */
  readonly link: (
    text: string,
    options: DocxLinkOptions
  ) => LitAstNode;
}

/** Semantic mark operation family. */
export interface DocxMarksApi {
  /** Creates a bold mark. */
  readonly bold: () => LitAstMark;
  /** Creates a highlight mark. */
  readonly highlight: (color?: string) => LitAstMark;
  /** Creates a semantic link mark. */
  readonly link: (options: DocxLinkMarkOptions) => LitAstMark;
  /** Creates a portable text-style mark. */
  readonly textStyle: (properties: DocxRunProperties) => LitAstMark;
}

/** Semantic style operation family. */
export interface DocxStylesApi {
  /** Creates one shading value. */
  readonly shading: (options: {
    readonly fill?: string | undefined;
    readonly color?: string | undefined;
    readonly pattern?: string | undefined;
  }) => DocxShading;
  /** Creates one border value. */
  readonly border: (options?: {
    readonly style?: string | undefined;
    readonly color?: string | undefined;
    readonly size?: number | undefined;
    readonly space?: number | undefined;
  }) => DocxBorder;
  /** Creates paragraph spacing. */
  readonly spacing: (options: DocxSpacing) => DocxSpacing;
  /** Creates paragraph indentation. */
  readonly indentation: (options: DocxIndentation) => DocxIndentation;
  /** Creates portable run properties. */
  readonly runProperties: (
    options: DocxRunProperties
  ) => DocxRunProperties;
  /** Creates portable paragraph properties. */
  readonly paragraphProperties: (
    options: DocxParagraphProperties
  ) => DocxParagraphProperties;
}

/** Reversible tagged-container operation family. */
export interface DocxRoundTripApi {
  /** @param source - Complete converted semantic document. @param omitted - Report each omitted optional source path. @returns Budgeted source with visible content retained. */
  readonly budget: <T extends LitAstNode>(source: T, omitted?: (path: string) => void) => T;
  /** @param node - Authored or parsed content control. @returns Validated feature metadata, absent after a visible edit. */
  readonly readMetadata: (node: LitAstNode) => DocxRoundTripMetadata | undefined;
  /** Selects one extension-defined tagged container during import. */
  readonly matchTag: (tag: string) => DocxNodeImportSource;
  /** Creates one tagged block content control. */
  readonly taggedBlock: (
    options: DocxTaggedContainerOptions
  ) => LitAstNode;
  /** Creates one tagged inline content control. */
  readonly taggedInline: (
    options: DocxTaggedContainerOptions
  ) => LitAstNode;
}

/** Explicit fallback operation family. */
export interface DocxFallbackApi {
  /** Removes one wrapper while retaining converted children. */
  readonly flattenChildren: (
    children: readonly LitAstNode[],
    options?: DocxFallbackOptions
  ) => readonly LitAstNode[];
  /** Converts mixed content into legal paragraph blocks. */
  readonly asParagraphs: (
    children: readonly LitAstNode[],
    options?: DocxFallbackOptions
  ) => readonly LitAstNode[];
  /** Converts content into a shaded one-cell table. */
  readonly asShadedTable: (
    options: DocxShadedTableFallbackOptions
  ) => readonly LitAstNode[];
  /** Uses a caller-resolved image as fallback content. */
  readonly asImage: (
    options: DocxImageFallbackOptions
  ) => readonly LitAstNode[];
  /** Omits unsupported content with one required diagnostic. */
  readonly omitWithDiagnostic: (
    options?: DocxFallbackOptions
  ) => readonly LitAstNode[];
}

/** Semantic resource operation family. */
export interface DocxResourcesApi {
  /** Creates one image resource request. */
  readonly image: (
    key: string,
    options: DocxImageOptions
  ) => DocxResourcePlan;
  /** Creates one named-style resource request. */
  readonly style: (key: string, styleId: string) => DocxResourcePlan;
  /** Creates one numbering resource request. */
  readonly numbering: (key: string, definitionId: string) => DocxResourcePlan;
  /** Creates one relationship request without exposing its OOXML URI. */
  readonly relationship: (
    options: DocxRelationshipOptions
  ) => DocxRelationshipPlan;
}

/** Complete semantic DOCX authoring facade. */
export interface DocxAuthoringApi {
  /** High-level codec definitions. */
  readonly codec: DocxCodecApi;
  /** Block builders. */
  readonly blocks: DocxBlocksApi;
  /** Table builders. */
  readonly tables: DocxTablesApi;
  /** Inline builders. */
  readonly inline: DocxInlineApi;
  /** Mark builders. */
  readonly marks: DocxMarksApi;
  /** Style builders. */
  readonly styles: DocxStylesApi;
  /** Tagged round-trip builders. */
  readonly roundTrip: DocxRoundTripApi;
  /** Explicit fallback recipes. */
  readonly fallback: DocxFallbackApi;
  /** Semantic resource builders. */
  readonly resources: DocxResourcesApi;
}
