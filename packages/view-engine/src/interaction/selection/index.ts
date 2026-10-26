export { buildQuireSelectionGeometry } from "./build";
export {
  createQuireSelectionGeometryContextFromHitTestResult,
  createQuireSelectionGeometryContextFromInteractionTarget,
  createQuireSelectionGeometryContextFromInteractionTargets,
  createQuireSelectionGeometryVisualContextFromInteractionTarget,
  resolveQuireActiveSelectionContext
} from "./context";
export {
  resolveQuirePointerHitSelectionSemantics,
  resolveQuireTextAnchorSelectionSemantics,
  resolveQuireTextCaretSelectionSemantics,
  resolveQuireTextExpandedSelectionSemantics,
  resolveQuireTextRangeSelectionSemantics
} from "./semantics";
export {
  resolveQuireHitTestSelectionTarget
} from "./target";
export {
  createQuireSelectionStructureIntervalIndex,
  QuireSelectionAdapterCompilationError
} from "./structure";
export {
  planQuireStructuredRange,
  QUIRE_STRUCTURED_RANGE_SELECTION_JSON_ID,
  QuireStructuredRangeSelection
} from "./structured-range";
export { resolveQuireExplicitInteractionOwnerFacts } from "./owner-facts";
export type {
  QuireActiveSelectionCommandTargetKind,
  QuireActiveSelectionContext,
  QuireActiveSelectionContextOptions,
  QuireActiveSelectionDomain,
  QuireCreateTextSelectionBetween,
  QuireHitTestSelectionTargetOptions,
  QuireInteractionSelectionCommandTargetKind,
  QuireInteractionSelectionHitKind,
  QuireInteractionSelectionTarget,
  QuirePointerHitSelectionSemanticsOptions,
  QuireSelectionDomain,
  QuireSelectionSemanticsResult,
  QuireTextAnchorSelectionSemanticsOptions,
  QuireTextCaretSelectionSemanticsOptions,
  QuireTextExpandedSelectionKind,
  QuireTextExpandedSelectionSemanticsOptions,
  QuireTextRangeSelectionSemanticsOptions
} from "./types";
export type {
  QuireSelectionStructureIntervalIndex,
  QuireSelectionStructureIntervalIndexOptions,
  QuireSelectionStructureOwnerFact,
  QuireSelectionStructureUnitFact
} from "./structure";
export type {
  QuireStructuredRangeDirection,
  QuireStructuredRangePlan,
  QuireStructuredRangePlannerOptions,
  QuireStructuredRangeSegment,
  QuireStructuredRangeSelectionJSON,
  QuireStructuredRangeStructureSegment,
  QuireStructuredRangeTextSegment
} from "./structured-range";
