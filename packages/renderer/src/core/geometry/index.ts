export {
  containsQuirePoint,
  doesQuireRectIntersectAny,
  doQuireRectsIntersect,
  intersectQuireRects,
  isQuireRectEmpty,
  isQuireRectFinite,
  measureQuireRectDistanceSquaredToPoint,
  normalizeQuirePositiveAreaRects
} from "./rect";
export {
  createQuireCenterRotationTransform,
  resolveQuirePointBounds,
  resolveQuireRectCorners,
  snapQuireAffineNumber,
  translateQuireAffineTransform,
  transformQuirePoint
} from "./affine";
export {
  containsQuireHitAreaPoint,
  containsQuireTargetPoint,
  createQuirePolygonHitArea,
  createQuireTransformedRectHitArea,
  transformQuireHitArea,
  translateQuireHitArea
} from "./hit-area";
export type {
  QuireAffineTransform,
  QuireHitArea,
  QuirePoint,
  QuirePolygonHitArea,
  QuireRect,
  QuireSize
} from "@quirekit/render-contract";
