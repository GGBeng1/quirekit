import type { QuireViewTarget } from "@quirekit/renderer";
import { resolveDefaultQuireViewPointerPolicyForLayer } from "./policy";
import { listQuireViewLayerStackPlaneDescriptors } from "./stack";
import type {
  QuireViewLayerPlane,
  QuireViewLayerRef,
  QuireViewPointerPolicy
} from "../types";

/**
 * Resolves the retained layer used by a qkView target.
 *
 * @param target - qkView target to classify.
 * @returns Retained layer reference for the target.
 */
export function resolveQuireViewTargetLayer(
  target: QuireViewTarget
): QuireViewLayerRef {
  return {
    plane: resolveQuireViewTargetLayerPlane(target) ?? "content"
  };
}

/**
 * Resolves the retained pointer policy used by a qkView target.
 *
 * @param target - qkView target to classify.
 * @param layer - Retained layer resolved for the target.
 * @returns Pointer policy for retained layer routing.
 */
export function resolveQuireViewTargetPointerPolicy(
  target: QuireViewTarget,
  layer: QuireViewLayerRef
): QuireViewPointerPolicy {
  if (target.pointerEvents === "none") {
    return {
      kind: "pass-through",
      shouldFocusEditor: false,
      shouldPreventDefault: false
    };
  }

  if (hasQuireViewTargetEventBindings(target)) {
    return {
      kind: "dispatch",
      shouldFocusEditor: true,
      shouldPreventDefault: true
    };
  }

  return resolveDefaultQuireViewPointerPolicyForLayer(layer);
}

/**
 * Reports whether a qkView target has at least one event binding.
 *
 * @param target - qkView target to inspect.
 * @returns Whether the target declares event handlers or actions.
 */
export function hasQuireViewTargetEventBindings(
  target: QuireViewTarget
): boolean {
  return Object.keys(target.events).length > 0;
}

/**
 * Resolves the retained layer plane requested by target owner metadata.
 *
 * @param target - qkView target to inspect.
 * @returns Explicit or inferred layer plane, or undefined for normal content.
 */
function resolveQuireViewTargetLayerPlane(
  target: QuireViewTarget
): QuireViewLayerPlane | undefined {
  return (
    readQuireViewTargetLayerPlaneMetadata(target) ??
    resolveQuireViewTargetOwnerLayerPlane(target) ??
    resolveQuireViewTargetRoleLayerPlane(target) ??
    resolveQuireViewTargetEventLayerPlane(target)
  );
}

/**
 * Reads an explicit layer plane from open renderer metadata.
 *
 * @param target - qkView target to inspect.
 * @returns Metadata layer plane when valid.
 */
function readQuireViewTargetLayerPlaneMetadata(
  target: QuireViewTarget
): QuireViewLayerPlane | undefined {
  const value = target.owner?.metadata?.layerPlane;

  return isQuireViewLayerPlane(value) ? value : undefined;
}

/**
 * Infers a retained layer plane from stable owner kinds.
 *
 * @param target - qkView target to inspect.
 * @returns Owner-derived layer plane, or undefined.
 */
function resolveQuireViewTargetOwnerLayerPlane(
  target: QuireViewTarget
): QuireViewLayerPlane | undefined {
  switch (target.owner?.kind) {
    case "decoration":
      return "annotation";
    case "control":
    case "content-control":
      return "controls";
    case "dom-proxy":
      return "dom-proxy";
    case "drawing":
    case "drawing-object":
    case "floating-object":
    case "shape":
    case "text-box":
      return "drawing";
    case "floating-ui":
      return "floating-ui";
    default:
      return undefined;
  }
}

/**
 * Infers a retained layer plane from common semantic roles.
 *
 * @param target - qkView target to inspect.
 * @returns Role-derived layer plane, or undefined.
 */
function resolveQuireViewTargetRoleLayerPlane(
  target: QuireViewTarget
): QuireViewLayerPlane | undefined {
  switch (target.role) {
    case "menu":
    case "popover":
    case "toolbar":
      return "floating-ui";
    case "control":
    case "resize-handle":
    case "rotate-handle":
      return "controls";
    default:
      return undefined;
  }
}

/**
 * Infers the controls plane for eventful targets with no stronger owner signal.
 *
 * @param target - qkView target to inspect.
 * @returns Controls layer for eventful targets, otherwise undefined.
 */
function resolveQuireViewTargetEventLayerPlane(
  target: QuireViewTarget
): QuireViewLayerPlane | undefined {
  return hasQuireViewTargetEventBindings(target) ? "controls" : undefined;
}

/**
 * Reports whether a metadata value is a known retained layer plane.
 *
 * @param value - Metadata value to test.
 * @returns Whether the value can be used as a retained layer plane.
 */
function isQuireViewLayerPlane(value: unknown): value is QuireViewLayerPlane {
  return typeof value === "string" &&
    listQuireViewLayerStackPlaneDescriptors().some(
      (descriptor) => descriptor.plane === value
    );
}
