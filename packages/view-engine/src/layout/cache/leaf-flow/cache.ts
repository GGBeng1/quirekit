import type { QuireBlockFlowCacheKey } from "@quirekit/layout/block-flow";
import type { QuireBlockLayoutInput } from "../../engine/block-types";
import type { QuireLayoutBox } from "../../engine/types";
import type { QuireLeafFlowCache } from "./types";
import { readQuireInputRelocationSource } from "../block/relocation/provenance";
import { shiftCanvasLeafBlockLayoutBox } from "../block/layout-shift";
import { areQuireInlineCapabilities } from "../block/relocation/admission";

/** Input fields whose immutable meaning is understood by this exact adapter. */
const knownInputFields = new Set<PropertyKey>([
  "id", "range", "minHeight", "spacingBefore", "spacingAfter", "blockStartInset",
  "blockEndInset", "textFragments",
  "textRuns", "sourceAnchors", "layoutSignature", "estimated", "pagination",
  "children", "sourceCapabilities", "flowExclusionGaps", "localFlowExclusions",
  "textFlowReflow", "layoutProvider", "viewRoot", "viewRegion", "viewCapabilities",
  "exportFallbacks", "regionProducts", "paragraphDecoration", "inlineContentWidth"
]);

/**
 * Creates a weak placement cache owned by one retained graph.
 *
 * Cached boxes remain in their original containing-flow coordinates and an
 * exact hit returns them unchanged. A relocated input (same content, shifted
 * document positions) reuses its source placement shifted by the block-start
 * and range deltas when every other geometry input is identical; anything else
 * uses canonical layout.
 *
 * @returns Adapter consumed by the existing neutral block-flow cache contract.
 */
export function createQuireLeafFlowCache(): QuireLeafFlowCache {
  const entries = new WeakMap<QuireBlockLayoutInput, {
    readonly key: QuireBlockFlowCacheKey;
    readonly box: QuireLayoutBox;
  }>();
  // Latest measured placement of any input carrying the same collected content,
  // so a lane that never placed the original can still shift a later relocation.
  // Shifted boxes are never recorded: each forwards lazy state to its source, and
  // shifting from one would chain every earlier frame's placement.
  const placedByOrigin = new WeakMap<QuireBlockLayoutInput, {
    readonly key: QuireBlockFlowCacheKey;
    readonly box: QuireLayoutBox;
  }>();
  const admissions = new WeakMap<QuireBlockLayoutInput, boolean>();
  let hits = 0;
  let relocations = 0;
  let misses = 0;
  let stores = 0;
  let bypasses = 0;

  /**
   * Resolves admission once for each immutable input without reading its shape.
   *
   * @param input - Candidate whose own fields define the dependency boundary.
   * @returns Whether exact ordinary leaf placement may be retained.
   */
  function accepts(input: QuireBlockLayoutInput): boolean {
    let accepted = admissions.get(input);
    if (accepted === undefined) {
      accepted = isOrdinaryLeaf(input);
      admissions.set(input, accepted);
    }
    return accepted;
  }

  return {
    /**
     * Reads one exact immutable leaf placement.
     *
     * @param input - Current immutable leaf input.
     * @param key - Complete containing-flow geometry.
     * @returns Original placed box, or undefined when admission or identity differs.
     */
    get(input, key) {
      if (!accepts(input)) {
        bypasses += 1;
        return undefined;
      }
      const entry = entries.get(input);
      if (entry !== undefined && sameGeometry(entry.key, key)) {
        hits += 1;
        return entry.box;
      }
      const relocated = entry === undefined ? readRelocatedPlacement(input, key) : undefined;
      if (relocated !== undefined) {
        entries.set(input, { key: { ...key }, box: relocated });
        relocations += 1;
        return relocated;
      }
      misses += 1;
      return undefined;
    },
    /**
     * Retains a successfully completed ordinary leaf placement.
     *
     * @param input - Immutable input that produced the box.
     * @param key - Complete geometry consumed by that placement.
     * @param box - Complete result retained without mutation or field copying.
     */
    set(input, key, box) {
      if (!accepts(input)) return;
      // Neutral flow calls set only after successful leaf construction. Keeping
      // the complete result also preserves lazy metadata and pagination policy.
      entries.set(input, { key: { ...key }, box });
      placedByOrigin.set(readQuireInputRelocationSource(input) ?? input, { key: { ...key }, box });
      stores += 1;
    },
    /**
     * Reads cumulative diagnostics without changing placement ownership.
     *
     * @returns Exact placement hits, misses, stores, and rejected lookups.
     */
    snapshot() {
      return { hits, relocations, misses, stores, bypasses };
    }
  };

  /**
   * Shifts a measured placement of the content a relocated input came from.
   *
   * Ordinary leaf placement only translates its text by the block origin, so a
   * position-only relocation at the same x, width and spacing is that placement
   * moved by the block-start and range deltas. Boxes with owner products are
   * rejected by the shift's own admission.
   *
   * @param input - Relocated current input.
   * @param key - Current containing-flow geometry.
   * @returns Shifted placement, or undefined when no exact source placement exists.
   */
  function readRelocatedPlacement(
    input: QuireBlockLayoutInput,
    key: QuireBlockFlowCacheKey
  ): QuireLayoutBox | undefined {
    const source = readQuireInputRelocationSource(input);
    if (source === undefined) return undefined;
    const matches = (candidate: { readonly key: QuireBlockFlowCacheKey } | undefined) =>
      candidate !== undefined && sameGeometry(candidate.key, { ...key, y: candidate.key.y });
    const placed = placedByOrigin.get(source);
    const entry = matches(placed) ? placed : entries.get(source);
    if (entry === undefined || !matches(entry)) return undefined;
    return shiftCanvasLeafBlockLayoutBox(
      entry.box,
      input,
      key.y - entry.key.y,
      input.range.from - entry.box.range.from
    );
  }
}

/**
 * Checks the complete admission boundary without opening lazy text fragments.
 *
 * @param input - Immutable block input produced by the editor bridge.
 * @returns Whether its leaf result has no independent snapshot authority.
 */
function isOrdinaryLeaf(input: QuireBlockLayoutInput): boolean {
  const prototype = Object.getPrototypeOf(input);
  return (prototype === Object.prototype || prototype === null)
    && input.children === undefined
    && input.layoutProvider === undefined
    && input.viewRoot === undefined
    && input.viewRegion === undefined
    && input.viewCapabilities === undefined
    && input.exportFallbacks === undefined
    && input.regionProducts === undefined
    && areQuireInlineCapabilities(input.sourceCapabilities)
    && (input.localFlowExclusions?.length ?? 0) === 0
    && (input.flowExclusionGaps?.length ?? 0) === 0
    && Reflect.ownKeys(input).every((field) => knownInputFields.has(field));
}

/**
 * Compares every placement input consumed by neutral block flow.
 *
 * @param previous - Geometry retained after successful placement.
 * @param current - Current containing-flow geometry.
 * @returns Whether returning the original box is exact.
 */
function sameGeometry(
  previous: QuireBlockFlowCacheKey,
  current: QuireBlockFlowCacheKey
): boolean {
  return previous.x === current.x
    && previous.y === current.y
    && previous.width === current.width
    && previous.blockHeight === current.blockHeight
    && previous.blockGap === current.blockGap
    && previous.fragmentBlockSize === current.fragmentBlockSize;
}
