import { planQuireStructuredRange } from "./planner";
import { QuireStructuredRangeSelection } from "./selection";
import type {
  QuireSelectionSemanticsResult,
  QuireTextRangeSelectionSemanticsOptions
} from "../types";

/**
 * Normalizes a drag crossing adapter-owned structures before endpoint fallbacks.
 *
 * Internal adapter gestures may delegate by returning an ordinary plan. Those
 * gestures continue into table-cell semantics and the ProseMirror selection
 * hook, preserving existing local editing behavior.
 *
 * @param options - Document, endpoint hits, and optional snapshot structure index.
 * @returns Structured selection semantics, or null when existing semantics own the range.
 */
export function resolveQuireStructuredRangeSelectionSemantics(
  options: QuireTextRangeSelectionSemanticsOptions
): QuireSelectionSemanticsResult | null {
  if (
    options.structureIndex === undefined ||
    options.anchorHitTestResult.kind === "miss" ||
    options.headHitTestResult.kind === "miss"
  ) {
    return null;
  }

  const plan = planQuireStructuredRange({
    anchor: options.anchorHitTestResult.position.pos,
    head: options.headHitTestResult.position.pos,
    structureIndex: options.structureIndex
  });
  if (!plan.requiresStructuredSelection) {
    return null;
  }

  return {
    domain: "text",
    selection: QuireStructuredRangeSelection.create(options.doc, plan)
  };
}
