import type { QuireRect } from "@quirekit/renderer";
import type { QuireClientPoint, QuireClientRect } from "@quirekit/view-engine";
import type { QuireLayoutSnapshot } from "@quirekit/view-engine";
import type { QuireViewPointerSelectionOptions } from "../../types";

/** Inputs used to create mounted view pointer selection options. */
interface CreateMountedPointerSelectionOptionsInput {
  /** Geometry snapshot already produced by the mounted render pass. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Browser client point to map into document space. */
  readonly clientPoint: QuireClientPoint;
  /** Mounted coordinate surface client rectangle. */
  readonly canvasClientRect: QuireClientRect;
  /** Document-space bounds the coordinate surface maps onto, when known. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/**
 * Creates view facade pointer selection options from mounted runtime state.
 *
 * @param input - Mounted surface, pointer, and render-state inputs.
 * @returns Pointer selection options accepted by the view facade.
 */
export function createMountedPointerSelectionOptions(
  input: CreateMountedPointerSelectionOptionsInput
): QuireViewPointerSelectionOptions {
  return {
    geometrySnapshot: input.geometrySnapshot,
    clientPoint: input.clientPoint,
    canvasClientRect: input.canvasClientRect,
    ...(input.surfaceBounds === undefined
      ? {}
      : { surfaceBounds: input.surfaceBounds })
  };
}
