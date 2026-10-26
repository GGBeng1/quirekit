import type {
  Mappable,
  Node as PMNode,
  Selection,
  SelectionBookmark
} from "@quirekit/pm";
import {
  mapStructuredRangePlan,
  resolveMappedStructuredRangePlan,
  type QuireMappedStructuredRangePlan
} from "./mapping";
import type { QuireStructuredRangePlan } from "./types";

type QuireStructuredRangeSelectionResolver = (
  doc: PMNode,
  plan: QuireStructuredRangePlan
) => Selection;

/** Document-independent bookmark for a durable structured range selection. */
export class QuireStructuredRangeBookmark implements SelectionBookmark {
  private readonly mapped: QuireMappedStructuredRangePlan;
  private readonly resolveSelection: QuireStructuredRangeSelectionResolver;

  /**
   * Creates a bookmark from a live or already-mapped structured plan.
   *
   * @param plan - Live plan or mapped bookmark state.
   * @param resolveSelection - Callback resolving a live selection.
   */
  constructor(
    plan: QuireStructuredRangePlan | QuireMappedStructuredRangePlan,
    resolveSelection: QuireStructuredRangeSelectionResolver
  ) {
    this.mapped = "plan" in plan
      ? plan
      : { plan, nearestPosition: null };
    this.resolveSelection = resolveSelection;
  }

  /**
   * Maps this bookmark through document changes.
   *
   * @param mapping - ProseMirror mapping to apply.
   * @returns Mapped structured range bookmark.
   */
  map(mapping: Mappable): SelectionBookmark {
    const mappedNearest = this.mapped.nearestPosition === null
      ? null
      : mapping.map(this.mapped.nearestPosition, 1);
    if (this.mapped.plan === null) {
      return new QuireStructuredRangeBookmark({
        plan: null,
        nearestPosition: mappedNearest
      }, this.resolveSelection);
    }
    const next = mapStructuredRangePlan(this.mapped.plan, mapping);
    return new QuireStructuredRangeBookmark({
      plan: next.plan,
      nearestPosition: mappedNearest ?? next.nearestPosition
    }, this.resolveSelection);
  }

  /**
   * Resolves this bookmark against the current document.
   *
   * @param doc - Target ProseMirror document.
   * @returns Structured selection or its declared safe fallback.
   */
  resolve(doc: PMNode): Selection {
    return resolveMappedStructuredRangePlan(
      doc,
      this.mapped,
      this.resolveSelection
    );
  }
}
