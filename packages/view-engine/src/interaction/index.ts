export {
  resolveQuireCommandRoutingScope,
  resolveQuireGenericEditCommandRoute,
  resolveQuireSelectionCommandRoute
} from "./command-routing";
export * from "./drawing-controller";
export {
  createIdentitySurfaceBounds,
  createViewCoordinateAuthority,
  resolveViewCoordinateAuthority
} from "./coordinate-authority";
export {
  createQuireViewCoordinatePoint,
  createQuireViewCoordinateRect,
  mapQuireViewViewportSizeToCanvasPhysical
} from "../view-graph/coordinate-space";
export {
  createQuireInteractionCommandRouteDiagnostics,
  createQuireInteractionCoordinatePathDiagnostics,
  createQuireInteractionGeometryDiagnostics,
  createQuireInteractionSelectionDiagnostics,
  createQuireInteractionSelectionTargetDiagnostics,
  mergeQuireInteractionDiagnostics,
  mergeQuireInteractionSelectionDiagnostics,
  withQuireInteractionDiagnostics
} from "./diagnostics";
export {
  createQuireInteractionGeometryAuthority,
  resolveQuireTextblockContentWidth,
  resolveQuireInteractionInputAnchor,
  resolveQuireInteractionNearestCaretAtPoint,
  resolveQuireInteractionPageBodyNearestCaret
} from "./geometry";
export {
  createQuirePointerClickTracker,
  hitTestQuireDocumentPointNearestCaret,
  hitTestQuirePointerNearestCaret,
  mapClientPointToQuirePoint,
  measureQuireClientPointDistance
} from "./pointer";
export {
  resolveQuireLineSelectionRange,
  resolveQuireWordSelectionRange
} from "./range";
export {
  buildQuireSelectionGeometry,
  createQuireSelectionStructureIntervalIndex,
  createQuireSelectionGeometryContextFromHitTestResult,
  createQuireSelectionGeometryContextFromInteractionTarget,
  createQuireSelectionGeometryContextFromInteractionTargets,
  createQuireSelectionGeometryVisualContextFromInteractionTarget,
  planQuireStructuredRange,
  QuireStructuredRangeSelection,
  resolveQuireActiveSelectionContext,
  resolveQuireHitTestSelectionTarget,
  resolveQuirePointerHitSelectionSemantics,
  resolveQuireTextAnchorSelectionSemantics,
  resolveQuireTextCaretSelectionSemantics,
  resolveQuireTextExpandedSelectionSemantics,
  resolveQuireTextRangeSelectionSemantics
} from "./selection";
export * from "./render-snapshot";
export * from "./table";
export { resolveQuireVerticalCaretPosition } from "./vertical-navigation";
export type {
  QuireCaretGeometry,
  QuireClientPoint,
  QuireClientPointMappingOptions,
  QuireClientRect,
  QuireHitTestResult,
  QuireMissHitTestResult,
  QuirePointerClickEvent,
  QuirePointerClickState,
  QuirePointerClickTracker,
  QuirePointerClickTrackerOptions,
  QuirePointerHitTestOptions,
  QuirePositionHitTestResult,
  QuireSelectionGeometry,
  QuireSelectionGeometryContext,
  QuireSelectionGeometryOptions,
  QuireSelectionGeometryVisualContext,
  QuireTableCellSelectionHit,
  QuireSelectionRangeGeometry,
  QuireTextSelectionRangeOptions,
  QuireVerticalCaretNavigationDirection,
  QuireVerticalCaretNavigationOptions,
  QuireViewClientPoint,
  QuireViewClientRect,
  QuireViewCoordinateAuthority,
  QuireViewSurfaceProjection
} from "./types";
export type {
  QuireViewCoordinateConversionStep,
  QuireViewCoordinatePath,
  QuireViewCoordinatePoint,
  QuireViewCoordinatePointMapping,
  QuireViewCoordinateRect,
  QuireViewCoordinateRectMapping,
  QuireViewCoordinateSize
} from "../view-graph";
export type {
  QuireControlSelectionCommandRoute,
  QuireControlSelectionCommandTargetKind,
  QuireDocumentSelectionCommandRoute,
  QuireEditableTextSelectionCommandRoute,
  QuireFieldSelectionCommandRoute,
  QuireCommandRoutingScope,
  QuireCommandRoutingScopeOptions,
  QuireCommandSelectionDomain,
  QuireCommandTargetKind,
  QuireGenericEditCommandIntent,
  QuireGenericEditCommandRoute,
  QuireGenericEditCommandRouteContext,
  QuireGenericEditCommandRouteOptions,
  QuireNodeSelectionCommandRoute,
  QuireObjectSelectionCommandRoute,
  QuireObjectSelectionCommandTargetKind,
  QuireReadonlyTextSelectionCommandRoute,
  QuireSelectionCommandRoute,
  QuireSelectionCommandIntent,
  QuireSelectionCommandRouteContext,
  QuireSelectionCommandRouteOptions,
  QuireTableCellsSelectionCommandRoute,
  QuireUnknownSelectionCommandRoute
} from "./command-routing";
export type {
  QuireInteractionCaretAtPositionOptions,
  QuireInteractionCaretAtPositionResult,
  QuireInteractionGeometryAuthority,
  QuireInteractionGeometryAuthorityOptions,
  QuireInteractionGeometryProvenance,
  QuireInteractionGeometryQuerySource,
  QuireInteractionHitTargetAtPointHit,
  QuireInteractionHitTargetAtPointInteractionHit,
  QuireInteractionHitTargetAtPointMiss,
  QuireInteractionHitTargetAtPointOptions,
  QuireInteractionHitTargetAtPointPositionHit,
  QuireInteractionHitTargetAtPointResult,
  QuireInteractionInputAnchorOptions,
  QuireInteractionInputAnchorResult,
  QuireInteractionInputAnchorRole,
  QuireInteractionNearestCaretAtPointHit,
  QuireInteractionNearestCaretAtPointMiss,
  QuireInteractionNearestCaretAtPointOptions,
  QuireInteractionNearestCaretAtPointResult,
  QuireInteractionPageBodyNearestCaretOptions,
  QuireInteractionPositionAtPointHit,
  QuireInteractionPositionAtPointMiss,
  QuireInteractionPositionAtPointOptions,
  QuireInteractionPositionAtPointResult,
  QuireInteractionRectAtPositionOptions,
  QuireInteractionRectAtPositionResult,
  QuireInteractionSelectionRectsOptions,
  QuireInteractionSelectionRectsResult
} from "./geometry";
export type {
  CreateQuireInteractionCommandRouteDiagnosticsOptions,
  CreateQuireInteractionCoordinatePathDiagnosticsOptions,
  CreateQuireInteractionGeometryDiagnosticsOptions,
  CreateQuireInteractionSelectionTargetDiagnosticsOptions,
  QuireInteractionClientPointDiagnostics,
  QuireInteractionClientRectDiagnostics,
  QuireInteractionCoordinatePathDiagnostics,
  QuireInteractionDiagnostics,
  QuireInteractionDiagnosticQuerySource,
  QuireInteractionInputAnchorDiagnosticSource,
  QuireInteractionInputAnchorDiagnostics,
  QuireInteractionMigrationFallbackKind,
  QuireInteractionMigrationFallbackUsage,
  QuireInteractionPointerPolicyDecisionKind,
  QuireInteractionPointerPolicyDiagnostics,
  QuireInteractionRootRegionDiagnostics,
  QuireInteractionSelectionDiagnostics
} from "./diagnostics";
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
  QuireSelectionStructureIntervalIndex,
  QuireSelectionStructureOwnerFact,
  QuireSelectionStructureUnitFact,
  QuireStructuredRangeDirection,
  QuireStructuredRangePlan,
  QuireStructuredRangePlannerOptions,
  QuireStructuredRangeSegment,
  QuireStructuredRangeSelectionJSON,
  QuireStructuredRangeStructureSegment,
  QuireStructuredRangeTextSegment,
  QuireTextAnchorSelectionSemanticsOptions,
  QuireTextCaretSelectionSemanticsOptions,
  QuireTextExpandedSelectionKind,
  QuireTextExpandedSelectionSemanticsOptions,
  QuireTextRangeSelectionSemanticsOptions
} from "./selection";
export { shouldMaterializeQuireSelectionTextblock } from "./selection/materialization";
export type { QuireSelectionMaterializationOptions } from "./selection/types";
