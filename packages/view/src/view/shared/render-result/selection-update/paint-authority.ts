import { resolveDisplayListStyles } from "@quirekit/view-engine";
import type { QuireViewBuildOptions, QuireViewRenderResult } from "../../../types";
import { readMountedImageTransformVersion } from "../../image-resource/authority";

const paintInputsByRoot = new WeakMap<object, readonly unknown[]>();

/**
 * Records the paint inputs accepted by a successful facade frame.
 * @param result - Fully built frame whose root survives overlay-only copies.
 * @param options - Exact inputs consumed by its full content compiler.
 */
export function rememberMountedSelectionPaintInputs(
  result: QuireViewRenderResult,
  options: QuireViewBuildOptions
): void {
  // Opaque transforms can read mutable external state. Their output still runs
  // through the full compiler while Engine can independently reuse layout.
  const inputs = paintInputs(options);
  if (inputs !== undefined) paintInputsByRoot.set(result.layoutSnapshot.root, inputs);
}

/**
 * Proves that an overlay update may retain the previous content commands.
 * @param result - Previously accepted facade frame.
 * @param options - Current mounted paint inputs, never retained options.
 * @returns Whether both the accepted and current paint inputs are proven equal.
 */
export function hasMountedSelectionPaintAuthority(
  result: QuireViewRenderResult,
  options: QuireViewBuildOptions
): boolean {
  const previous = paintInputsByRoot.get(result.layoutSnapshot.root);
  const current = paintInputs(options);
  return previous !== undefined && current !== undefined
    && previous.length === current.length
    && previous.every((value, index) => Object.is(value, current[index]));
}

/** @param options - Current frame inputs. @returns Proven paint tokens, or unknown. */
function paintInputs(options: QuireViewBuildOptions): readonly unknown[] | undefined {
  const transform = options.displayListTransform;
  const version = transform === undefined ? 0 : readMountedImageTransformVersion(transform);
  return version === undefined ? undefined : [paintSignature(options), transform, version];
}

/**
 * Copies bounded resolved style tokens and current content projection policy.
 * @param options - Current frame inputs.
 * @returns Value signature immune to in-place style and rectangle mutation.
 */
function paintSignature(options: QuireViewBuildOptions): string {
  return JSON.stringify([
    resolveDisplayListStyles(options.displayListStyles, options.surfaceConfig),
    options.activeAuxiliaryStorySourceId,
    options.decorationScope,
    options.displayListClipRects?.map(({ x, y, width, height }) => [x, y, width, height])
  ]);
}
