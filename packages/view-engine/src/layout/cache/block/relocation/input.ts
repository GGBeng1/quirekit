import { shiftQuireInlineSourceAnchors } from "@quirekit/layout/inline";
import { defineQuireLazyLayoutSignature, forwardQuireLayoutSignature } from "@quirekit/layout/block-flow";
import {
  markQuireTextFragmentsSortedByLineTop, readQuireTextFragmentFlowOrderMetadata,
  type QuireTextFragment
} from "@quirekit/layout/text";
import type { QuireBlockLayoutInput } from "../../../engine/block-types";
import { shiftQuireTextFragment } from "../../../engine/lazy-text-fragments";
import type { QuireTextblockCapabilityRebind, QuireTextblockFlowRebinder } from "../types";
import { readQuireInputRelocationFields } from "./admission";
import { recordQuireInputRelocation } from "./provenance";

/** Source fields rebuilt from current PM positions instead of descriptor copying. */
const replacedInputFields = new Set<PropertyKey>([
  "range", "textRuns", "sourceAnchors", "textFragments", "textFlowReflow", "layoutSignature"
]);
/** Fields also rebuilt when freshly resolved capability sidecars replace the cached ones. */
const replacedCapabilityInputFields = new Set<PropertyKey>([...replacedInputFields, "sourceCapabilities"]);

/**
 * Relocates ordinary cached data while the collector rebinds its source service.
 * @param input - Cached ordinary source input.
 * @param delta - Current minus cached absolute document start.
 * @param rebind - Current collector's source-bound service authority.
 * @param capabilities - Sidecars resolved for the current snapshot, replacing the cached ones.
 * @returns Complete relocated input, or a conservative miss.
 */
export function relocateQuireTextblockInput(
  input: QuireBlockLayoutInput,
  delta: number,
  rebind?: QuireTextblockFlowRebinder,
  capabilities?: QuireTextblockCapabilityRebind
): QuireBlockLayoutInput | undefined {
  if (delta === 0 && capabilities === undefined) return input;
  const fields = readQuireInputRelocationFields(input, capabilities !== undefined);
  if (fields === undefined) return undefined;
  const reflow = input.textFlowReflow === undefined
    ? undefined : rebind?.(input.textFlowReflow);
  if (input.textFlowReflow !== undefined && reflow === undefined) return undefined;

  // Admission already inspected every key. Build PM fields directly and obtain
  // descriptors only for retained policy, preserving frozen/accessor semantics.
  const moved: QuireBlockLayoutInput = {
    id: input.id,
    range: { from: input.range.from + delta, to: input.range.to + delta },
    ...(input.textRuns === undefined ? {} : {
      textRuns: input.textRuns.map((run) => ({
        ...run, range: { from: run.range.from + delta, to: run.range.to + delta }
      }))
    }),
    ...(input.sourceAnchors === undefined ? {} : {
      sourceAnchors: shiftQuireInlineSourceAnchors(input.sourceAnchors, delta)
    }),
    ...(reflow === undefined ? {} : { textFlowReflow: reflow }),
    ...(capabilities === undefined ? {} : { sourceCapabilities: capabilities.sourceCapabilities })
  };
  const target = moved as unknown as Record<PropertyKey, unknown>;
  const replaced = capabilities === undefined ? replacedInputFields : replacedCapabilityInputFields;
  for (const field of fields) {
    if (replaced.has(field)) continue;
    const descriptor = Object.getOwnPropertyDescriptor(input, field)!;
    if ("value" in descriptor && descriptor.writable === true
      && descriptor.enumerable === true && descriptor.configurable === true) {
      target[field] = descriptor.value;
    } else {
      Object.defineProperty(moved, field, descriptor);
    }
  }
  if (capabilities === undefined) forwardQuireLayoutSignature(moved, input);
  else defineQuireLazyLayoutSignature(moved, () => capabilities.layoutSignature(moved));
  if (fields.includes("textFragments")) {
    let fragments: readonly QuireTextFragment[] | undefined;
    Object.defineProperty(moved, "textFragments", {
      configurable: true, enumerable: true,
      get() {
        if (fragments !== undefined) return fragments;
        const source = input.textFragments;
        if (source === undefined) return undefined;
        if (fragments === undefined) {
          const shifted = source.map((fragment) => shiftQuireTextFragment(fragment, 0, delta));
          fragments = readQuireTextFragmentFlowOrderMetadata(source)?.sortedByLineTop === true
            ? markQuireTextFragmentsSortedByLineTop(shifted) : shifted;
        }
        return fragments;
      }
    });
  }
  recordQuireInputRelocation(moved, input);
  return moved;
}
