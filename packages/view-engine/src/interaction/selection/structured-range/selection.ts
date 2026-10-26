import {
  Selection,
  SelectionRange,
  Slice,
  type Mappable,
  type Node as PMNode,
  type SelectionBookmark,
  type Transaction
} from "@quirekit/pm";
import { QuireStructuredRangeBookmark } from "./bookmark";
import { createStructuredRangeContent } from "./content";
import {
  replaceStructuredRanges,
  replaceStructuredRangesWithNode
} from "./replacement";
import type {
  QuireStructuredRangeDirection,
  QuireStructuredRangePlan,
  QuireStructuredRangeSegment,
  QuireStructuredRangeSelectionJSON
} from "./types";
import {
  assertStructuredRangePlan,
  QUIRE_STRUCTURED_RANGE_SELECTION_JSON_ID,
  readStructuredRangeSelectionJSON,
  writeStructuredRangeSelectionJSON
} from "./validation";

/** Durable ProseMirror selection spanning text and adapter-owned structures. */
export class QuireStructuredRangeSelection extends Selection {
  /** Logical gesture direction independent from source range ordering. */
  readonly direction: QuireStructuredRangeDirection;

  /** Exact source-ordered text and semantic structure segments. */
  readonly segments: readonly QuireStructuredRangeSegment[];

  /**
   * Creates a validated structured selection from resolved state.
   *
   * @param doc - Document owning the plan.
   * @param plan - Validated durable plan.
   */
  private constructor(
    doc: PMNode,
    plan: QuireStructuredRangePlan
  ) {
    super(
      doc.resolve(plan.anchor),
      doc.resolve(plan.head),
      plan.segments.map((segment) => new SelectionRange(
        doc.resolve(segment.range.from),
        doc.resolve(segment.range.to)
      ))
    );
    this.direction = plan.direction;
    this.segments = plan.segments;
  }

  /**
   * Creates a durable structured range selection.
   *
   * @param doc - Document owning all absolute positions.
   * @param plan - Planner output to validate and retain.
   * @returns Durable ProseMirror selection.
   */
  static create(
    doc: PMNode,
    plan: QuireStructuredRangePlan
  ): QuireStructuredRangeSelection {
    assertStructuredRangePlan(doc, plan);
    return new QuireStructuredRangeSelection(doc, plan);
  }

  /**
   * Compares this selection with another ProseMirror selection.
   *
   * @param selection - Selection to compare.
   * @returns Whether logical endpoints and every semantic segment match.
   */
  eq(selection: Selection): boolean {
    return selection instanceof QuireStructuredRangeSelection &&
      JSON.stringify(selection.toJSON()) === JSON.stringify(this.toJSON());
  }

  /**
   * Maps this selection through document changes.
   *
   * @param doc - Next ProseMirror document.
   * @param mapping - Position mapping to apply.
   * @returns Mapped structured selection or its declared safe fallback.
   */
  map(doc: PMNode, mapping: Mappable): Selection {
    return this.getBookmark().map(mapping).resolve(doc);
  }

  /**
   * Returns exactly selected ranges without their unselected source gaps.
   *
   * @returns Clipboard-ready maximally open slice.
   */
  content(): Slice {
    return createStructuredRangeContent(this.$anchor.doc, this.segments);
  }

  /**
   * Replaces the selection according to adapter-owned fallback policies.
   *
   * @param transaction - Transaction receiving replacement steps.
   * @param content - Slice inserted at the earliest selected source range.
   */
  replace(
    transaction: Transaction,
    content = Slice.empty
  ): void {
    replaceStructuredRanges(transaction, this.segments, content);
  }

  /**
   * Replaces the selection with one node according to adapter policies.
   *
   * @param transaction - Transaction receiving replacement steps.
   * @param node - Node inserted at the earliest selected source range.
   */
  replaceWith(transaction: Transaction, node: PMNode): void {
    replaceStructuredRangesWithNode(transaction, this.segments, node);
  }

  /**
   * Exposes the exact structural content to shared clipboard writers.
   *
   * @returns Clipboard payload containing the exact selected slice.
   */
  serializeClipboard(): { readonly slice: Slice } {
    return { slice: this.content() };
  }

  /**
   * Serializes this selection for editor-state persistence.
   *
   * @returns Registered structured range selection payload.
   */
  toJSON(): QuireStructuredRangeSelectionJSON {
    return writeStructuredRangeSelectionJSON(this.toPlan());
  }

  /**
   * Restores a structured range selection from persisted JSON.
   *
   * @param doc - Document owning the restored selection.
   * @param json - Untrusted persisted selection payload.
   * @returns Validated durable structured range selection.
   */
  static fromJSON(
    doc: PMNode,
    json: unknown
  ): QuireStructuredRangeSelection {
    return QuireStructuredRangeSelection.create(
      doc,
      readStructuredRangeSelectionJSON(json)
    );
  }

  /**
   * Creates a document-independent bookmark for history and mapping.
   *
   * @returns Structured range bookmark retaining adapter fallbacks.
   */
  getBookmark(): SelectionBookmark {
    return new QuireStructuredRangeBookmark(
      this.toPlan(),
      QuireStructuredRangeSelection.create
    );
  }

  /**
   * Reconstructs the immutable logical plan retained by this selection.
   *
   * @returns Durable structured range plan.
   */
  private toPlan(): QuireStructuredRangePlan {
    return {
      anchor: this.anchor,
      head: this.head,
      direction: this.direction,
      requiresStructuredSelection: true,
      segments: this.segments
    };
  }
}

Selection.jsonID(
  QUIRE_STRUCTURED_RANGE_SELECTION_JSON_ID,
  QuireStructuredRangeSelection
);
