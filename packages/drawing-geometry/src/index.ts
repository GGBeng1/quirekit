export { drawingPresetNames } from "./presets/names";
export { isDrawingPreset, isLineDrawingPreset, isOpenDrawingPreset, readDrawingAdjustments } from "./presets/catalog";
export type { DrawingPresetName, DrawingPathFill } from "./presets/types";
export { resolveDrawingPreset } from "./evaluation/resolve";
export type { DrawingGeometryPoint, DrawingGeometrySegment, ResolvedDrawingPath, ResolvedDrawingGeometry } from "./evaluation/types";
export { resolveDrawingAdjustmentHandles } from "./adjustments/resolve";
export { solveDrawingAdjustment } from "./adjustments/solve";
export type { DrawingAdjustmentAxis, DrawingAdjustmentHandle, DrawingAdjustmentRequest } from "./adjustments/types";
export type {
  DrawingAppearance, DrawingExtent, DrawingFill, DrawingKind, DrawingPayload, DrawingShapeGeometry, DrawingShapePath,
  DrawingShapePoint, DrawingShapeSegment, DrawingShapeTextRect, DrawingStroke, DrawingTextBody, DrawingTextInsets,
  DrawingTransform, DrawingEmbeddedReference, DrawingEmbeddedReplacement, DrawingEmbeddedPresentation
} from "./model/types";
export type {
  DrawingAnchor, DrawingAnchorAlignedPosition, DrawingAnchorHorizontalAlignment, DrawingAnchorHorizontalPosition,
  DrawingAnchorHorizontalReference, DrawingAnchorInput, DrawingAnchorLayoutMode, DrawingAnchorMovement,
  DrawingAnchorOffsetPosition, DrawingAnchorPatch, DrawingAnchorVerticalAlignment, DrawingAnchorVerticalPosition,
  DrawingAnchorVerticalReference, DrawingWrap, DrawingWrapContour, DrawingWrapContourPath, DrawingWrapContourPoint,
  DrawingWrapDistances, DrawingWrapInput, DrawingWrapMode, DrawingWrapSide
} from "./model/anchor";
export type { DrawingResizePolicy, DrawingResizeWidthSnap } from "./model/resize/types";
