export { layoutQuireInlineTextFragmentsFromQuireLayout } from "./quire-fragments";
export { sliceQuireInlineTextRunsToRange } from "./run-slice";
export {
  compileQuireInlineFlowRegions,
  quireZeroInlineSourceClearance,
  subtractQuireInlineExclusionGeometries,
  subtractQuireInlineRectangles,
  translateQuireInlineExclusionGeometry
} from "./flow-region";
export type {
  QuireInlineLayoutOptions,
  QuireInlineReplacement,
  QuireInlineTextRun,
  QuireLayoutMeasuredPhase,
  QuireLayoutTraceSink,
  QuireLineBreakMode
} from "./types";
export type {
  QuireInlineFlowExclusion,
  QuireInlineFlowLine,
  QuireInlineFlowOccurrence,
  QuireInlineFlowRegion,
  QuireInlineFlowRegionCompileInput,
  QuireInlineFlowRegionCompileResult,
  QuireInlineFlowRegionGap,
  QuireInlineExclusionGeometry,
  QuireInlineExclusionPath,
  QuireInlineExclusionPoint,
  QuireInlineGeometrySubtraction,
  QuireInlineInterval,
  QuireInlineRectangleSubtraction
} from "./flow-region";
export {
  baselineQuireLineBreakerPolicy,
  classifyQuireLineBreakSegment,
  describeQuireLineBreakSegment,
  isQuireHardBreakSegment,
  mergeQuireLineBreakMetadata,
  resolveQuireLineBreakerPolicy
} from "./line-breaker";
export type {
  QuireLineBreakMetadata,
  QuireLineBreakerPolicy,
  QuireLineBreakSegmentInfo,
  QuireLineBreakUnitKind
} from "./line-breaker";
export type {
  QuireInlineSourceVisualOccurrence,
  QuireInlineSourceVisualOccurrenceGap
} from "./visual-occurrence";
export {
  shiftQuireInlineSourceAnchors,
  sliceQuireInlineSourceAnchorsToRange
} from "./source-anchor";
export type { QuireInlineSourceAnchor } from "./source-anchor";
export type {
  QuireInlineSourceAlignedPlacement,
  QuireInlineSourceAlignment,
  QuireInlineSourceAnchorMovement,
  QuireInlineSourceBlockPlacement,
  QuireInlineSourceBlockReference,
  QuireInlineSourceClearance,
  QuireInlineSourceContourPath,
  QuireInlineSourceContourPoint,
  QuireInlineSourceExtent,
  QuireInlineSourceFlowExclusionIntent,
  QuireInlineSourceInlinePlacement,
  QuireInlineSourceInlineReference,
  QuireInlineSourceLayoutMode,
  QuireInlineSourceOffsetPlacement,
  QuireInlineSourcePlacementDeclaration
} from "./source-placement";
export * from "./source-capability";
