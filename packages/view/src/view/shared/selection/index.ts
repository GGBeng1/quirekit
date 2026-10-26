export { resolveMountedSelectionBetween } from "./between";
export {
  createMountedSelectionGeometryContext,
  createMountedSelectionAnchorHitTestResult,
  createMountedSelectionRangeGeometryContext,
  createMountedSelectionRangeGeometryContextFromVisualContexts,
  resolveMountedSelectionAnchorVisualContext,
  resolveMountedSelectionRangeEndpointTargets
} from "./context";
export type {
  MountedSelectionAnchorHitTestResultOptions,
  MountedSelectionAnchorVisualContextOptions,
  MountedSelectionRangeEndpointTargets
} from "./context";
export { shouldMaterializeMountedSelectionTextblock } from "./materialization";
export type {
  MountedSelectionMaterializationOptions
} from "./materialization";
