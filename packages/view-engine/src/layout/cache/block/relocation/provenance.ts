import type { QuireBlockLayoutInput } from "../../../engine/block-types";

/** Relocated input → the collected input whose content it carries at a new position. */
const relocationSources = new WeakMap<QuireBlockLayoutInput, QuireBlockLayoutInput>();

/**
 * Records that an input is a position-only relocation of another input.
 *
 * Chains collapse to the originally collected input, so a consumer holding a
 * result for that input can shift it by the current range delta directly.
 *
 * @param moved - Relocated input.
 * @param source - Input it was relocated from.
 */
export function recordQuireInputRelocation(
  moved: QuireBlockLayoutInput,
  source: QuireBlockLayoutInput
): void {
  relocationSources.set(moved, relocationSources.get(source) ?? source);
}

/**
 * Reads the collected input an input was relocated from.
 *
 * @param input - Candidate relocated input.
 * @returns Originally collected input, or undefined for a collected input.
 */
export function readQuireInputRelocationSource(
  input: QuireBlockLayoutInput
): QuireBlockLayoutInput | undefined {
  return relocationSources.get(input);
}
