import { translateQuireAffineTransform } from "@quirekit/renderer";
import { shiftQuireInlineSourceAnchors } from "@quirekit/layout/inline";
import { forwardQuireLayoutSignature } from "@quirekit/layout/block-flow";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type { QuireLayoutBox } from "../../engine/types";
import {
  attachQuireLazyShiftedTextFragments,
  materializeQuireLazyShiftedTextFragments,
  quireLazyShiftedTextFragmentsKey,
  resolveQuireLazyShiftedTextFragmentSource
} from "../../engine/lazy-text-fragments";
import {
  acceptsQuireBoxRelocation,
  acceptsQuireInputRelocation,
  haveSameQuireCapabilityPlacements
} from "./relocation/admission";

/**
 * Relocates a validated ordinary leaf while preserving complete physical policy.
 *
 * Unknown owner products return a miss before retained reconciliation commits.
 * Source services come from the current input, never the old placed box.
 * @param box - Retained leaf layout box.
 * @param input - Current source input with current-position service authority.
 * @param dy - Vertical translation in the same containing-flow coordinate system.
 * @param rangeDelta - Current minus retained document start.
 * @returns Complete shifted box, or undefined when safe projection is unavailable.
 */
export function shiftCanvasLeafBlockLayoutBox(
  box: QuireLayoutBox,
  input: QuireBlockLayoutInput,
  dy: number,
  rangeDelta: number
): QuireLayoutBox | undefined {
  if (!acceptsQuireInputRelocation(input) || !acceptsQuireBoxRelocation(box)
    || (box.textFlowReflow !== undefined && input.textFlowReflow === undefined)
    || !haveSameQuireCapabilityPlacements(box.sourceCapabilities, input.sourceCapabilities)) return undefined;

  // Known physical fields retain their descriptors; only coordinate-dependent
  // fields are replaced before defining the new object, including frozen input.
  const descriptors: PropertyDescriptorMap = Object.getOwnPropertyDescriptors(box);
  for (const field of ["range", "rect", "inlineLayoutRect", "textRuns", "sourceAnchors", "sourceCapabilities",
    "textFragments", "textFlowReflow", "layoutSignature", "paintTransform", "paintBounds"]) {
    delete descriptors[field];
  }
  Reflect.deleteProperty(descriptors, quireLazyShiftedTextFragmentsKey);
  const shifted: QuireLayoutBox = Object.defineProperties({
    id: box.id,
    range: input.range,
    rect: { ...box.rect, y: box.rect.y + dy },
    ...(box.inlineLayoutRect === undefined ? {} : {
      inlineLayoutRect: { ...box.inlineLayoutRect, y: box.inlineLayoutRect.y + dy }
    }),
    ...(box.paintBounds === undefined ? {} : {
      paintBounds: { ...box.paintBounds, y: box.paintBounds.y + dy }
    }),
    ...(box.paintTransform === undefined ? {} : {
      paintTransform: translateQuireAffineTransform(box.paintTransform, 0, dy)
    }),
    ...(box.textRuns === undefined ? {} : {
      textRuns: box.textRuns.map((run) => ({
        ...run, range: { from: run.range.from + rangeDelta, to: run.range.to + rangeDelta }
      }))
    }),
    ...(box.sourceAnchors === undefined ? {} : {
      sourceAnchors: shiftQuireInlineSourceAnchors(box.sourceAnchors, rangeDelta)
    }),
    // Sidecars carry the current presentation; their placements were checked equal.
    ...(box.sourceCapabilities === undefined ? {} : { sourceCapabilities: input.sourceCapabilities }),
    ...(input.textFlowReflow === undefined ? {} : { textFlowReflow: input.textFlowReflow })
  }, descriptors);
  forwardQuireLayoutSignature(shifted, box);

  // Reuse the existing lazy provenance to compose repeated moves against the
  // original fragments, without accumulating caret-stop wrapper chains.
  const source = resolveQuireLazyShiftedTextFragmentSource(box);
  if (source !== undefined) {
    const metadata = {
      sourceFragments: source.sourceFragments,
      dy: source.dy + dy,
      rangeDelta: source.rangeDelta + rangeDelta
    };
    let fragments: readonly QuireTextFragment[] | undefined;
    attachQuireLazyShiftedTextFragments(shifted, metadata);
    Object.defineProperty(shifted, "textFragments", {
      configurable: true, enumerable: true,
      get() { return fragments ??= materializeQuireLazyShiftedTextFragments(metadata); }
    });
  }
  return shifted;
}
