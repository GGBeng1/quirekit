import type { QuireTextTabs, QuireTextLayoutOptions } from "@quirekit/renderer";
import type { QuireDocumentFontTheme, QuireEditor, QuireEditorState, QuireFontSelectionResolver, QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { QuireBlockPaginationPolicy } from "@quirekit/layout/block-flow";
import type { QuireTableSource } from "@quirekit/layout/table";
import type { QuireInlineSourcePlacementDeclaration } from "@quirekit/layout/inline";
import type { QuireMediaIntrinsicSize, QuireMediaReference } from "@quirekit/media";
import type {
  DrawingAnchor, DrawingAnchorInput, DrawingAnchorPatch, DrawingPayload, DrawingPresetName, DrawingShapeGeometry,
  DrawingEmbeddedPresentation
} from "@quirekit/drawing-geometry";
import type { QuireImageColorAdjustment, QuireImageSourceCrop } from "@quirekit/renderer";
import type { QuirePageGeometry, QuirePaginationReferenceFacts } from "@quirekit/layout/pagination";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { Node as ProseMirrorNode, Selection } from "@quirekit/pm";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireInlineSourceCapabilityResolver } from "../layout/engine/inline/source-capability/types";

/** Facet names a document profile may supply to the layout engine. */
export type QuireDocumentProfileFacetName = "inline-sources" | "page-model" | "paragraph-model" | "table-model" | "drawing-model";

/** Auxiliary story kept in the document but laid out outside body flow. */
export interface QuireAuxiliaryStory {
  /** Persisted story id. */
  readonly id: string;
  /** Story category, such as `header`, `footer`, or a drawing-text body. */
  readonly kind: string;
  /** Story container node. */
  readonly node: ProseMirrorNode;
  /** Absolute position where story content starts. */
  readonly from: number;
  /** Absolute position where story content ends. */
  readonly to: number;
  /** Child-index path from the document root to the story node. */
  readonly path: readonly number[];
}

/** Page section as seen by the engine; `token` is opaque and only passed back to the profile. */
export interface QuirePageSection {
  /** Optional final bottom-region constraint; absent preserves ordinary section semantics. */
  readonly terminalRegion?: import("@quirekit/layout/pagination").QuireTerminalRegionConstraint | undefined;
  /** Top-level child index of the section owner. */
  readonly index: number;
  /** Absolute position before the section owner. */
  readonly position: number;
  /** Node type name of the section owner, used for occurrence identity. */
  readonly nodeType: string;
  /** Persisted owner id, when present. */
  readonly stableId: string | null;
  /** Whether the section starts on the previous section's last page instead of a new page. */
  readonly continuesPreviousPage?: boolean | undefined;
  /** Required physical sheet parity after a preceding section; absent means the next sheet. */
  readonly startPageParity?: "odd" | "even" | undefined;
  /** Model-owned section semantics. */
  readonly token: unknown;
}

/** One footnote placed at the page bottom below the line holding its reference. */
export interface QuirePageFootnote {
  /** Stable note identity. */
  readonly id: string;
  /** Story holding the note body, listed by `listStories`. */
  readonly storyId: string;
  /** Absolute position of the inline reference in the body. */
  readonly referencePosition: number;
}

/** One end note placed after the end of the body flow. */
export interface QuirePageEndnote {
  /** Stable note identity. */
  readonly id: string;
  /** Story holding the note body, listed by `listStories`. */
  readonly storyId: string;
}

/** Separator rule geometry above page-bottom notes, in CSS pixels. */
export interface QuirePageNoteSeparator {
  /** Rule length from the note area's start edge, capped at the area width. */
  readonly length: number;
  /** Stroke width. */
  readonly lineWidth: number;
}

/** Line grid that snaps paragraph lines to a fixed pitch. */
export interface QuireLineGrid {
  /** Line pitch in CSS pixels. */
  readonly linePitch: number;
  /** Stable identity for measurement caches. */
  readonly signature: string;
}

/** List marker a document model resolves for one paragraph. */
export interface QuireListMarker {
  /** Position of the paragraph owning the marker. */
  readonly position: number;
  /** Marker text before display projection. */
  readonly text: string;
  /** Marker kind. */
  readonly kind: "ordered" | "bullet" | "task";
  /** Task state, or null for non-task markers. */
  readonly checked: boolean | null;
  /** Separator between the marker and the body. */
  readonly suffix: "tab" | "space" | "nothing";
  /** Logical marker alignment inside the hanging interval. */
  readonly justification: "start" | "center" | "end";
  /** Effective paragraph indentation token. */
  readonly indentation: unknown;
  /** Numbering-level indentation token. */
  readonly levelIndentation: unknown;
}

/** Marker typography shared by measurement and paint. */
export interface QuireListMarkerTypography {
  /** Display text. */
  readonly text: string;
  /** CSS font shorthand. */
  readonly font: string;
  /** Explicit glyph color. */
  readonly textColor?: string;
  /** Decoration lines. */
  readonly textDecoration?: readonly ("underline" | "line-through")[];
  /** Explicit marker font size in CSS pixels, when the model sets one. */
  readonly explicitFontSize?: number | undefined;
  /** Upward baseline shift in CSS pixels, for superscript markers. */
  readonly baselineShift?: number | undefined;
}

/** Interaction dispatched by an interactive list marker. */
export interface QuireListMarkerTarget {
  /** Registered handler id. */
  readonly handler: string;
  /** Immutable handler payload. */
  readonly payload: unknown;
  /** Model owner reported on the target. */
  readonly owner: { readonly id: string; readonly name: string; readonly metadata: Readonly<Record<string, unknown>> };
}

/** Document-wide paragraph style authority resolved once per snapshot. */
export interface QuireParagraphStyleContext {
  /** Model-owned style authority passed back to the model. */
  readonly token: unknown;
  /** Stable style identity, or null when the document has no named styles. */
  readonly signature: string | null;
  /** Whether justified lines ending in a soft break stretch. */
  readonly justifySoftBreaks: boolean;
}

/** Logical paragraph alignment. */
export type QuireParagraphAlignment = "start" | "center" | "end" | "justify" | "distribute";

/** Paragraph border side in CSS pixels. */
export interface QuireParagraphBorder {
  /** Border style token understood by the renderer. */
  readonly style: string;
  /** Stroke color; omitted for automatic color. */
  readonly strokeStyle?: string | undefined;
  /** Line width. */
  readonly lineWidth: number;
  /** Distance from paragraph content. */
  readonly space: number;
}

/** Effective paragraph formatting in layout terms. */
export interface QuireParagraphFormatting extends Pick<QuireTextLayoutOptions, "autoSpacing" | "avoidPunctuationBreaks"> {
  /** Explicit logical tab stops in CSS pixels; absent for ordinary text flow. */
  readonly tabs?: QuireTextTabs | undefined;
  /** Model-owned effective formatting passed back to the model. */
  readonly token: unknown;
  /** Stable identity of every layout-affecting field. */
  readonly signature: string;
  /** Indentation token resolved by `resolveIndentation`. */
  readonly indentation: unknown;
  /** Logical alignment, or null for start. */
  readonly alignment: QuireParagraphAlignment | null;
  /** Explicit base direction, or null to infer. */
  readonly direction: "ltr" | "rtl" | null;
  /** Line-grid snapping, or null to inherit participation. */
  readonly snapToGrid: boolean | null;
  /** Line spacing in lines (`multiple`) or CSS pixels, or null for single spacing. */
  readonly lineSpacing: {
    /** Rule used to compute the line advance. */
    readonly mode: "exact" | "at-least" | "multiple";
    /** Multiplier or physical height in CSS pixels. */
    readonly value: number;
    /** Baseline fraction used only for exact line boxes. */
    readonly exactBaselineRatio?: number | undefined;
  } | null;
  /** Whether line metrics come from measured glyphs rather than the inherited strut. */
  readonly naturalLineMetrics: boolean;
  /** Block pagination policy. */
  readonly pagination: QuireBlockPaginationPolicy;
  /** Paragraph-mark typography with the font size in CSS pixels, or null when absent. */
  readonly markTypography: {
    readonly bold: boolean | null; readonly italic: boolean | null; readonly fontSize: number | null;
    readonly fontFamily: string | null; readonly underline: boolean | null; readonly strike: boolean | null;
    readonly color: string | null;
  } | null;
  /** Fill and logical borders, or null for a plain paragraph. */
  readonly decoration: {
    /** Symmetric expansion of the text indentation interval in CSS pixels. */
    readonly inlineOutset?: number | undefined;
    readonly fill?: string | undefined; readonly top?: QuireParagraphBorder | undefined;
    readonly bottom?: QuireParagraphBorder | undefined; readonly start?: QuireParagraphBorder | undefined;
    readonly end?: QuireParagraphBorder | undefined;
  } | null;
}

/** Paragraph semantics consumed by the engine's paragraph pipeline. */
export interface QuireParagraphModelProfile {
  /** Compiles an optional character font-slot override once per source run. */
  readonly fontSelection?: QuireFontSelectionResolver;
  /** Reads a paragraph node's direct indentation as a model-owned token. */
  readonly nodeIndentation: (node: ProseMirrorNode) => unknown;
  /** Resolves an indentation token into logical start, end and first-line insets in CSS pixels. */
  readonly resolveIndentation: (indentation: unknown, characterPitch: number, characterGrid?: QuireCharacterGrid | null) =>
    { readonly start: number; readonly end: number; readonly firstLine: number };
  /** Resolves list markers keyed by paragraph position. */
  readonly listMarkers: (doc: ProseMirrorNode) => ReadonlyMap<number, QuireListMarker>;
  /** Resolves the tab stop after a marker ending at `end` CSS pixels on the logical axis. */
  readonly markerTab: (marker: QuireListMarker, end: number, characterPitch: number) =>
    { readonly position: number; readonly defaultGrid: boolean };
  /** Resolves marker typography from the paragraph font and paragraph-mark paint. */
  readonly markerTypography: (marker: QuireListMarker, bodyFont: string, theme: QuireDocumentFontTheme | undefined,
    inheritance: { readonly textColor?: string | undefined; readonly textDecoration?: QuireListMarkerTypography["textDecoration"] | undefined }) =>
    QuireListMarkerTypography;
  /** Resolves the interaction an interactive marker dispatches for its paragraph range. */
  readonly markerTarget: (marker: QuireListMarker, range: QuireDocumentRange) => QuireListMarkerTarget;
  /** Reports whether a textblock is a checked task whose content paints dimmed. */
  readonly isCheckedTask: (textblock: ProseMirrorNode) => boolean;
  /** Resolves the document-wide style authority. */
  readonly styleContext: (doc: ProseMirrorNode) => QuireParagraphStyleContext;
  /** Resolves effective formatting; `tableLayer` is the containing cell's style layer token. */
  readonly resolveParagraph: (node: ProseMirrorNode, context: QuireParagraphStyleContext, tableLayer: unknown) =>
    QuireParagraphFormatting;
  /** Creates cache identity for style-derived typography of one paragraph. */
  readonly styleTextSignature: (node: ProseMirrorNode, context: QuireParagraphStyleContext, tableLayer: unknown) => string;
  /** Applies style-derived typography to an extension-resolved node style. */
  readonly nodeTextStyle: (nodeStyle: QuireNodeCanvasTextStyle | null, node: ProseMirrorNode,
    context: QuireParagraphStyleContext, tableLayer: unknown) => QuireNodeCanvasTextStyle | null;
  /** Resolves line metrics from natural metrics in CSS pixels. */
  readonly lineMetrics: (formatting: QuireParagraphFormatting, naturalLineHeight: number, naturalBaselineOffset: number) =>
    { readonly lineHeight: number; readonly baselineOffset: number; readonly mode: "minimum" | "exact" };
  /** Resolves space before and after the paragraph in CSS pixels. */
  readonly blockSpacing: (formatting: QuireParagraphFormatting, lineHeight: number) =>
    { readonly before: number; readonly after: number };
}

/** Page band that repeats an auxiliary story on every page. */
export type QuirePageBand = "header" | "footer";

/** Inputs for choosing the story shown in one page band. */
export interface QuirePageBandStoryInput {
  /** Document root carrying document-level settings. */
  readonly doc: ProseMirrorNode;
  /** Section owning the physical page. */
  readonly section: QuirePageSection;
  /** Band being filled. */
  readonly band: QuirePageBand;
  /** Zero-based physical page index within the section. */
  readonly sectionPageIndex: number;
}

/** Page semantics: sections, page geometry, auxiliary stories and page numbering. */
export interface QuirePageModelProfile {
  /** Identity namespace for auxiliary story layout roots. */
  readonly storyNamespace: string;
  /** Lists auxiliary stories, laid out outside body flow, in document order. */
  readonly listStories: (doc: ProseMirrorNode) => readonly QuireAuxiliaryStory[];
  /** Decides whether a top-level node participates in body flow. */
  readonly isBodyFlowBlock: (node: ProseMirrorNode) => boolean;
  /** Lists independently paginated sections; fewer than two means single-section layout. */
  readonly listSections: (doc: ProseMirrorNode) => readonly QuirePageSection[];
  /** Resolves the section owning single-section layout, or null when the document is not paged. */
  readonly leadingSection: (doc: ProseMirrorNode) => QuirePageSection | null;
  /** Resolves a section's page geometry in CSS pixels from the first sheet's document-space origin. */
  readonly sectionPageGeometry: (section: QuirePageSection, origin: QuireRect) => QuirePageGeometry | undefined;
  /** Returns the section with its effective starting number, continuing from `nextPageNumber` when it does not restart. */
  readonly continueNumbering: (section: QuirePageSection, nextPageNumber: number) => QuirePageSection;
  /** Resolves the number of the section's first physical page. */
  readonly firstPageNumber: (section: QuirePageSection) => number;
  /** Formats a page number or page count with the section's number format. */
  readonly formatPageNumber: (section: QuirePageSection, value: number) => string;
  /** @param section - Effective section, or null for unsectioned documents. @param value - Accepted integer page/count fact. @param token - Opaque source-owned formatting specification. @param doc - Canonical document for document-wide policy. @param reference - Optional physical source/target relation. @returns Formatted text, or null to retain the source cache for an unsupported context. */
  readonly formatPaginationText?: (section: QuirePageSection | null, value: number, token: unknown, doc?: ProseMirrorNode, reference?: QuirePaginationReferenceFacts) => string | null;
  /** @param doc - Canonical source. @param token - Opaque source recipe. @param bodyRanges - Accepted body ranges on the physical sheet. @returns Occurrence text, or null to preserve the source result. */
  readonly formatPageSourceText?: (doc: ProseMirrorNode, token: unknown, bodyRanges: readonly QuireDocumentRange[]) => string | null;
  /** Chooses the persisted story shown in one page band, or null when the band is empty. */
  readonly bandStory: (input: QuirePageBandStoryInput) => string | null;
  /** Resolves the band's distance from the page edge in CSS pixels, or null when it is not placed. */
  readonly bandDistance: (section: QuirePageSection, band: QuirePageBand) => number | null;
  /** Decides whether a measured band pushes the body edge away from it. */
  readonly bandClampsBody: (section: QuirePageSection, band: QuirePageBand) => boolean;
  /** Resolves the document's page fill color, or null for the surface default. */
  readonly pageFill: (doc: ProseMirrorNode) => string | null;
  /** Lists footnotes whose bodies sit at the bottom of the page or column holding their reference. */
  readonly listFootnotes: (doc: ProseMirrorNode) => readonly QuirePageFootnote[];
  /** Separator rule drawn above a page or column's first footnote, in CSS pixels. */
  readonly footnoteSeparator: QuirePageNoteSeparator;
  /** Lists end notes placed after the last body content, in display order; their separator matches the footnotes'. */
  readonly listEndnotes: (doc: ProseMirrorNode) => readonly QuirePageEndnote[];
  /** Resolves the line grid a container establishes: undefined when it owns none, null when its grid is off. */
  readonly lineGrid: (node: ProseMirrorNode) => QuireLineGrid | null | undefined;
  /** Resolves container character constraints in layout pixels; undefined inherits and null disables. */
  readonly characterGrid?: ((node: ProseMirrorNode, doc: ProseMirrorNode) => QuireCharacterGrid | null | undefined) | undefined;
  /** Reads a section's explicit band distance in twentieths of a point for editing, or null when not editable. */
  readonly readBandDistanceSetting: (section: ProseMirrorNode, band: QuirePageBand) => number | null;
  /** Writes the band distance of the section at `sectionPosition` in twentieths of a point; returns whether it applied. */
  readonly writeBandDistanceSetting: (editor: QuireEditor, sectionPosition: number, band: QuirePageBand, value: number) => boolean;
}

/** Inputs available when a profile creates inline source resolvers for one snapshot. */
export interface QuireInlineSourceProfileContext {
  /** Editor state being laid out. */
  readonly state: QuireEditorState;
  /** Canonical text measurer shared with paragraph layout. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Fallback CSS font used when a source has no resolved run style. */
  readonly font: string;
  /** Fallback line height used when a source has no resolved run style. */
  readonly lineHeight: number;
  /** Fallback baseline offset used when a source has no resolved run style. */
  readonly baselineOffset: number;
}

/**
 * Creates the inline source resolvers a document model owns.
 *
 * Each resolver claims exact node types; the engine rejects duplicate claims.
 *
 * @param context - Snapshot-scoped measurement and typography inputs.
 * @returns Resolvers installed for one snapshot build.
 */
export type QuireInlineSourceProfileFactory = (
  context: QuireInlineSourceProfileContext
) => readonly QuireInlineSourceCapabilityResolver[];

/** Payload shape a document profile registers through Core's `addDocumentProfiles()`. */
export interface QuireDocumentLayoutProfile {
  /** Inline source resolvers for model-owned inline nodes such as fields. */
  readonly "inline-sources"?: QuireInlineSourceProfileFactory | undefined;
  /** Page model; created once per profile resolution. */
  readonly "page-model"?: (() => QuirePageModelProfile) | undefined;
  /** Paragraph model; created once per profile resolution. */
  readonly "paragraph-model"?: (() => QuireParagraphModelProfile) | undefined;
  /** Table model; created once per profile resolution. */
  readonly "table-model"?: (() => QuireTableModelProfile) | undefined;
  /** Drawing model; created once per profile resolution. */
  readonly "drawing-model"?: (() => QuireDrawingModelProfile) | undefined;
}

/** Explicit table cell located by a table model's grid map. */
export interface QuireTableMapCell {
  /** Explicit cell id. */
  readonly id: string;
  /** Semantic cell id after merges, or null for a continuation cell. */
  readonly semanticCellId: string | null;
  /** Row index inside the table node. */
  readonly rowIndex: number;
  /** Cell index inside the row node. */
  readonly cellIndex: number;
  /** Cell position relative to the table node start. */
  readonly cellPos: number;
}

/** Grid map derived from one table node; the model reads it back as its own token. */
export interface QuireTableMap {
  /** Explicit cells in source order. */
  readonly explicitCells: readonly QuireTableMapCell[];
}

/** Document-wide table style authority resolved once per snapshot. */
export interface QuireTableStyleContext {
  /** Model-owned style authority passed back to the model. */
  readonly token: unknown;
  /** Identity of the style authority, or null when none is declared. */
  readonly signature: string | null;
  /** Identity for block collection caches, or null when no styles can affect layout. */
  readonly blockSignature: string | null;
}

/** Semantic cell covered by a cell selection. */
export interface QuireTableSelectedCell {
  /** Semantic cell id matching laid-out table cells. */
  readonly id: string;
  /** Origin cell position relative to the table node start. */
  readonly originCellPos: number;
}

/** Structural protocol by which the engine and View recognize any table model's cell selection. */
export interface QuireTableCellSelection {
  /** Absolute position before the table node. */
  readonly tablePos: number;
  /** Selected semantic cells. */
  readonly cells: readonly QuireTableSelectedCell[];
}

/** Inputs for normalizing one table node into layout input. */
export interface QuireTableSourceRequest {
  /** Stable table id within the snapshot. */
  readonly tableId: string;
  /** Document range of the table node. */
  readonly tableRange: QuireTableSource["tableRange"];
  /** Table node. */
  readonly tableNode: ProseMirrorNode;
  /** Grid map built by the same model. */
  readonly map: QuireTableMap;
  /** Document table style context. */
  readonly styleContext: QuireTableStyleContext;
}

/** Table semantics consumed by the engine's grid table provider. */
export interface QuireTableModelProfile {
  /** Node type laid out as a grid table, or null when the model has none. */
  readonly tableNodeType: string | null;
  /** Node type of a table cell, or null when the model has none. */
  readonly cellNodeType: string | null;
  /** Resolves the document-wide table style authority. */
  readonly styleContext: (doc: ProseMirrorNode) => QuireTableStyleContext;
  /** Derives the grid map of a table node; throws for an invalid table. */
  readonly map: (table: ProseMirrorNode) => QuireTableMap;
  /** Normalizes a table node into renderer-neutral table layout input. */
  readonly source: (request: QuireTableSourceRequest) => QuireTableSource;
  /** Resolves the paragraph style layer token a cell at `childPath` contributes, if any. */
  readonly cellStyleLayer: (doc: ProseMirrorNode, table: ProseMirrorNode, childPath: readonly number[]) => unknown;
  /** Classifies the earliest layout product a changed table, row or cell attribute affects. */
  readonly attributeImpact: (attribute: string) => "structure" | "border-style" | "row-layout" | "cell-layout" | "style";
  /** Finds the semantic cell whose origin or continuation cell starts at a table-relative position. */
  readonly semanticCellAt: (map: QuireTableMap, relativeCellPos: number) => QuireTableSelectedCell | null;
  /** Reports whether a cell node only continues a merged cell above and takes no caret. */
  readonly isContinuationCell: (cell: ProseMirrorNode) => boolean;
  /** Creates a cell selection satisfying `QuireTableCellSelection`; throws for invalid cells. */
  readonly createCellSelection: (doc: ProseMirrorNode,
    cells: { readonly tablePos: number; readonly anchorCellPos: number; readonly headCellPos: number }) => Selection;
}

/** Raster picture painted by a drawing object. */
export interface QuireDrawingPicture {
  /** Optional normalized sRGB channel transform. */
  readonly colorAdjustment?: QuireImageColorAdjustment;
  /** Optional uniform image opacity. */
  readonly opacity?: number;
  /** Media reference resolved by the mounted View. */
  readonly source: QuireMediaReference;
  /** Intrinsic raster size in source pixels, when known. */
  readonly intrinsicSize: QuireMediaIntrinsicSize | null;
  /** Source-space crop fractions. */
  readonly crop: QuireImageSourceCrop;
}

/** Drawing object a document model anchors in text. */
export interface QuireDrawingObject {
  /** Stable anchor object identity. */
  readonly objectId: string;
  /** Drawing payload painted inside the object frame. */
  readonly drawing: DrawingPayload<QuireDrawingPicture>;
  /** Text-box story identity, or null for a drawing without text. */
  readonly storyId: string | null;
  /** Renderer-neutral placement of the object frame. */
  readonly placement: QuireInlineSourcePlacementDeclaration;
  /** Prepared embedded presentation, independent of document-specific content. */
  readonly embeddedPresentation?: DrawingEmbeddedPresentation;
}

/** Drawing semantics consumed by the engine's anchored-object pipeline. */
export interface QuireDrawingModelProfile {
  /** Node type anchoring drawing objects in text, or null when the model has none. */
  readonly anchorNodeType: string | null;
  /** Reads the object an anchor node carries, or undefined for invalid attrs. */
  readonly readObject: (attrs: unknown, doc?: object) => QuireDrawingObject | undefined;
  /** Reads the editable anchor an anchor node carries, or undefined for invalid attrs. */
  readonly readAnchor: (attrs: unknown) => DrawingAnchor | undefined;
  /** Applies a patch with the same normalization as `updateAnchor`. */
  readonly patchAnchor: (anchor: DrawingAnchor, patch: DrawingAnchorPatch) => DrawingAnchor;
  /** Updates the anchor at `position` in one transaction; returns whether the model accepted it. */
  readonly updateAnchor: (editor: QuireEditor, request: { readonly attrs: DrawingAnchorPatch; readonly position?: number;
    readonly targetPosition?: number | undefined; readonly historyBoundary?: boolean | undefined }) => boolean;
  /** Inserts a shape or text box anchored at `position`; returns whether the model accepted it. */
  readonly insertAnchor: (editor: QuireEditor,
    request: { readonly kind: "shape" | "text-box"; readonly position: number; readonly attrs: DrawingAnchorInput }) => boolean;
  /** Deletes the anchor at `position` in one transaction; returns whether the model accepted it. */
  readonly deleteAnchor: (editor: QuireEditor, position: number) => boolean;
  /** Creates a default text-box drawing, or a preset shape when `preset` is given. */
  readonly createDrawing: (drawingId: string, preset?: DrawingPresetName) => DrawingPayload;
  /** Validates a value as shape geometry. */
  readonly readShapeGeometry: (value: unknown) => DrawingShapeGeometry | undefined;
}

/** Complete facet set consumed by the engine after defaults are applied. */
export interface QuireResolvedDocumentProfile {
  /** Inline source resolvers; the neutral default installs none. */
  readonly inlineSources: QuireInlineSourceProfileFactory;
  /** Page model; the neutral default is continuous flow without stories. */
  readonly pageModel: QuirePageModelProfile;
  /** Paragraph model; the neutral default has no indentation. */
  readonly paragraphModel: QuireParagraphModelProfile;
  /** Table model; the neutral default lays out no grid tables. */
  readonly tableModel: QuireTableModelProfile;
  /** Drawing model; the neutral default anchors no drawing objects. */
  readonly drawingModel: QuireDrawingModelProfile;
}
import type { QuireCharacterGrid } from "@quirekit/renderer";
