import type { QuirePageModelProfile, QuireParagraphFormatting, QuireResolvedDocumentProfile } from "./types";

/** Start-aligned single-spaced paragraph with the conventional two-line widow and orphan control. */
const neutralParagraphFormatting: QuireParagraphFormatting = {
  avoidPunctuationBreaks: true, tabs: undefined, token: null, signature: "", indentation: null, alignment: null, direction: null, snapToGrid: null,
  lineSpacing: null, naturalLineMetrics: false, pagination: { widows: 2, orphans: 2 }, markTypography: null, decoration: null
};

/** Continuous flow without sections, stories or page bands; numbers are decimal from 1. */
const neutralPageModel: QuirePageModelProfile = {
  storyNamespace: "story",
  listStories: () => [],
  isBodyFlowBlock: () => true,
  listSections: () => [],
  leadingSection: () => null,
  sectionPageGeometry: () => undefined,
  continueNumbering: (section) => section,
  firstPageNumber: () => 1,
  formatPageNumber: (_section, value) => String(value),
  formatPaginationText: (_section, value) => String(value),
  formatPageSourceText: () => null,
  bandStory: () => null,
  bandDistance: () => null,
  bandClampsBody: () => true,
  pageFill: () => null,
  listFootnotes: () => [],
  footnoteSeparator: { length: 189, lineWidth: 0.75 },
  listEndnotes: () => [],
  lineGrid: () => undefined,
  readBandDistanceSetting: () => null,
  writeBandDistanceSetting: () => false
};

/**
 * Neutral facet implementations used when no document profile supplies a facet.
 *
 * Each default must reproduce the engine's existing output for documents that
 * do not use the facet; the layout-parity goldens prove this.
 */
export const quireNeutralDocumentProfile: QuireResolvedDocumentProfile = {
  inlineSources: () => [],
  pageModel: neutralPageModel,
  paragraphModel: {
    fontSelection: () => undefined,
    nodeIndentation: () => null,
    resolveIndentation: () => ({ start: 0, end: 0, firstLine: 0 }),
    listMarkers: () => new Map(),
    markerTab: (_marker, end) => ({ position: end, defaultGrid: true }),
    markerTypography: (marker, bodyFont) => ({ text: marker.text, font: bodyFont }),
    markerTarget: () => ({ handler: "", payload: null, owner: { id: "", name: "", metadata: {} } }),
    isCheckedTask: () => false,
    styleContext: () => ({ token: undefined, signature: null, justifySoftBreaks: true }),
    resolveParagraph: () => neutralParagraphFormatting,
    styleTextSignature: () => "none",
    nodeTextStyle: (nodeStyle) => nodeStyle,
    lineMetrics: (_formatting, lineHeight, baselineOffset) => ({ lineHeight, baselineOffset, mode: "minimum" }),
    blockSpacing: () => ({ before: 0, after: 0 })
  },
  tableModel: {
    tableNodeType: null,
    cellNodeType: null,
    styleContext: () => ({ token: undefined, signature: null, blockSignature: null }),
    map: () => { throw new RangeError("The neutral document profile has no grid tables."); },
    source: () => { throw new RangeError("The neutral document profile has no grid tables."); },
    cellStyleLayer: () => undefined,
    attributeImpact: () => "style",
    semanticCellAt: () => null,
    isContinuationCell: () => false,
    createCellSelection: () => { throw new RangeError("The neutral document profile has no grid tables."); }
  },
  drawingModel: {
    anchorNodeType: null, readObject: () => undefined, readAnchor: () => undefined, patchAnchor: (anchor) => anchor,
    updateAnchor: () => false, insertAnchor: () => false, deleteAnchor: () => false, readShapeGeometry: () => undefined,
    createDrawing: () => { throw new RangeError("The neutral document profile has no drawing objects."); }
  }
};
