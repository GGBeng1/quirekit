import type { QuireLayoutProviderContext } from "@quirekit/view-engine/layout-provider";
import type { FloatingObjectAttributes } from "../types";
import type { FloatingObjectPlan } from "./continuation";

/**
 * Accepts persisted relative geometry against current parent constraints.
 *
 * @param context - Current provider execution.
 * @param geometry - Valid persisted geometry.
 * @returns Immutable accepted plan.
 */
export function createFloatingObjectPlan(
  context: QuireLayoutProviderContext,
  geometry: FloatingObjectAttributes
): FloatingObjectPlan {
  const width = Math.min(geometry.width, context.constraints.inlineSize);
  return Object.freeze({
    width,
    minHeight: geometry.minHeight,
    inlineOffset: Math.min(
      geometry.inlineOffset,
      Math.max(0, context.constraints.inlineSize - width)
    ),
    blockOffset: geometry.blockOffset
  });
}

/**
 * Creates the exact dependency signature for one accepted geometry plan.
 *
 * @param context - Current provider execution.
 * @param geometry - Valid persisted geometry.
 * @returns Stable dependency signature.
 */
export function createFloatingObjectDependencySignature(
  context: QuireLayoutProviderContext,
  geometry: FloatingObjectAttributes
): string {
  return [
    "floating-object-plan-v1",
    context.constraints.inlineSize,
    geometry.width,
    geometry.minHeight,
    geometry.inlineOffset,
    geometry.blockOffset
  ].join(":");
}
