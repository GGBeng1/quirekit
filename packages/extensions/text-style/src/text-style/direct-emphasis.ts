import type { QuireEditorState } from "@quirekit/core";
import type { Mark, MarkType, Node, Transaction } from "@quirekit/pm";
import { hasTextStyleAttributes } from "../style-attributes";

/** Ordinary direct-emphasis fields with Word-compatible inheritance semantics. */
export type DirectEmphasisField = "bold" | "italic";

/** Exact direct state: null inherits, true enables, and false disables. */
export type DirectEmphasisState = boolean | null;

/** One inclusive/exclusive text range receiving an atomic direct-state update. */
export interface DirectEmphasisRange {
  /** Inclusive ProseMirror position. */
  readonly from: number;
  /** Exclusive ProseMirror position. */
  readonly to: number;
}

/** Effective selection state after paragraph-style inheritance is applied. */
export type EffectiveDirectEmphasisState = boolean | "mixed";

/** One text range and the canonical direct value needed by a toggle. */
export interface DirectEmphasisStateRange extends DirectEmphasisRange {
  /** Canonical direct value: null inherits, true enables, and false disables. */
  readonly value: DirectEmphasisState;
}

/** Atomic plan for toggling one effective bold or italic selection. */
export interface DirectEmphasisTogglePlan {
  /** Effective state before the toggle. */
  readonly effective: EffectiveDirectEmphasisState;
  /** Stored-mark value for a collapsed selection. */
  readonly pointValue?: DirectEmphasisState | undefined;
  /** Per-fragment values for a non-empty selection. */
  readonly ranges: readonly DirectEmphasisStateRange[];
}

/** One source text segment and its current marks. */
interface DirectEmphasisSegment extends DirectEmphasisRange {
  /** Current semantic and text-style marks on the text segment. */
  readonly marks: readonly Mark[];
  /** Closest textblock whose calculated style supplies inheritance. */
  readonly textblock: Node;
}

/**
 * Reads ordinary bold or italic direct state without flattening inheritance.
 *
 * @param marks - Canonical marks on one text segment.
 * @param field - Direct emphasis field to inspect.
 * @returns Exact direct state, or undefined for a conflicting/malformed model.
 */
export function readDirectEmphasisState(
  marks: readonly Mark[],
  field: DirectEmphasisField
): DirectEmphasisState | undefined {
  const semantic = marks.some((mark) => mark.type.name === field);
  const textStyle = marks.find((mark) => mark.type.name === "textStyle");
  const override = textStyle?.attrs[field];

  if (override === undefined || override === null) {
    return semantic ? true : null;
  }
  if (override !== true && override !== false) return undefined;
  if (semantic && override === false) return undefined;
  return semantic || override;
}

/**
 * Reads effective bold or italic for the current selection.
 *
 * Direct true/false wins over the closest textblock's calculated Canvas/SVG
 * style. A mixed result remains explicit so product surfaces never present a
 * partially formatted selection as uniformly active.
 *
 * @param state - Current Quire editor state.
 * @param field - Ordinary emphasis field to inspect.
 * @returns Effective true, false, or mixed; undefined for no text or malformed state.
 */
export function readEffectiveDirectEmphasisState(
  state: QuireEditorState,
  field: DirectEmphasisField
): EffectiveDirectEmphasisState | undefined {
  return createDirectEmphasisTogglePlan(state, field)?.effective;
}

/**
 * Builds one canonical effective toggle plan without flattening inheritance.
 *
 * Enabling a fragment already enabled by its paragraph style removes a direct
 * override; disabling such a fragment writes explicit false. The inverse
 * applies to normal inherited text. Mixed selections toggle uniformly on,
 * matching office-product toolbar behavior while preserving each paragraph's
 * own inheritance boundary.
 *
 * @param state - Current Quire editor state.
 * @param field - Ordinary emphasis field to toggle.
 * @returns Atomic point/range plan, or undefined for no text or malformed state.
 */
export function createDirectEmphasisTogglePlan(
  state: QuireEditorState,
  field: DirectEmphasisField
): DirectEmphasisTogglePlan | undefined {
  const selection = state.pm.selection;
  if (selection.empty) {
    const marks = state.pm.storedMarks ?? selection.$from.marks();
    const direct = readDirectEmphasisState(marks, field);
    const textblock = findClosestTextblock(state.doc, selection.$from.pos);
    if (direct === undefined || textblock === null) return undefined;
    const inherited = readInheritedDirectEmphasis(state, textblock, field);
    const effective = direct ?? inherited;
    const desired = !effective;
    return {
      effective,
      pointValue: desired === inherited ? null : desired,
      ranges: []
    };
  }

  const segments = collectDirectEmphasisSegmentsFromDocument(
    state.doc,
    selection.ranges.map((range) => ({
      from: range.$from.pos,
      to: range.$to.pos
    }))
  );
  if (segments.length === 0) return undefined;

  const resolved = segments.map((segment) => {
    const direct = readDirectEmphasisState(segment.marks, field);
    if (direct === undefined) return undefined;
    const inherited = readInheritedDirectEmphasis(state, segment.textblock, field);
    return {
      ...segment,
      inherited,
      effective: direct ?? inherited
    };
  });
  if (resolved.some((segment) => segment === undefined)) return undefined;
  const valid = resolved as readonly NonNullable<(typeof resolved)[number]>[];
  const first = valid[0]!.effective;
  const effective = valid.every((segment) => segment.effective === first)
    ? first
    : "mixed";
  const desired = effective === true ? false : true;

  return {
    effective,
    ranges: valid.map((segment) => ({
      from: segment.from,
      to: segment.to,
      value: desired === segment.inherited ? null : desired
    }))
  };
}

/**
 * Applies one exact direct bold/italic state to all supplied text ranges.
 *
 * The function preflights every source segment before adding transaction steps,
 * so malformed true-mark/false-override input cannot leave a partial mutation.
 *
 * @param transaction - Undispatched root transaction.
 * @param ranges - Inclusive/exclusive text ranges to update.
 * @param field - Direct emphasis field to update.
 * @param value - Exact new direct state.
 * @param semanticMarkType - Bold or italic semantic mark type.
 * @param textStyleMarkType - Text-style mark carrying explicit false.
 * @returns Whether at least one text segment was updated without conflict.
 */
export function applyDirectEmphasisStateToRanges(
  transaction: Transaction,
  ranges: readonly DirectEmphasisRange[],
  field: DirectEmphasisField,
  value: DirectEmphasisState,
  semanticMarkType: MarkType,
  textStyleMarkType: MarkType
): boolean {
  const segments = collectDirectEmphasisSegments(transaction, ranges);
  if (
    segments.length === 0
    || segments.some((segment) => readDirectEmphasisState(segment.marks, field) === undefined)
  ) {
    return false;
  }

  for (const segment of segments) {
    const textStyle = segment.marks.find((mark) => mark.type === textStyleMarkType);
    const attributes = { ...(textStyle?.attrs ?? {}), [field]: null };

    transaction.removeMark(segment.from, segment.to, semanticMarkType);
    transaction.removeMark(segment.from, segment.to, textStyleMarkType);
    if (value === true) {
      transaction.addMark(segment.from, segment.to, semanticMarkType.create());
    } else if (value === false) {
      attributes[field] = false;
    }
    if (hasTextStyleAttributes(attributes)) {
      transaction.addMark(
        segment.from,
        segment.to,
        textStyleMarkType.create(attributes)
      );
    }
  }
  return true;
}

/**
 * Collects all text fragments intersecting the requested ranges.
 *
 * @param transaction - Transaction whose current document is authoritative.
 * @param ranges - Requested inclusive/exclusive ranges.
 * @returns Ordered intersecting text segments.
 */
function collectDirectEmphasisSegments(
  transaction: Transaction,
  ranges: readonly DirectEmphasisRange[]
): readonly DirectEmphasisSegment[] {
  return collectDirectEmphasisSegmentsFromDocument(transaction.doc, ranges);
}

/**
 * Collects source fragments and their closest textblock inheritance owner.
 *
 * @param documentNode - Authoritative document.
 * @param ranges - Requested inclusive/exclusive ranges.
 * @returns Ordered intersecting text segments.
 */
function collectDirectEmphasisSegmentsFromDocument(
  documentNode: Node,
  ranges: readonly DirectEmphasisRange[]
): readonly DirectEmphasisSegment[] {
  const segments: DirectEmphasisSegment[] = [];
  for (const range of ranges) {
    documentNode.nodesBetween(range.from, range.to, (node, position) => {
      if (!node.isText) return;
      const from = Math.max(range.from, position);
      const to = Math.min(range.to, position + node.nodeSize);
      const textblock = findClosestTextblock(documentNode, from);
      if (from < to && textblock !== null) {
        segments.push({ from, to, marks: node.marks, textblock });
      }
    });
  }
  return segments;
}

/**
 * Finds the closest textblock containing a document position.
 *
 * @param documentNode - Authoritative document.
 * @param position - ProseMirror document position.
 * @returns Closest textblock, or null outside editable text.
 */
function findClosestTextblock(documentNode: Node, position: number): Node | null {
  const resolved = documentNode.resolve(Math.max(
    0,
    Math.min(position, documentNode.content.size)
  ));
  for (let depth = resolved.depth; depth >= 0; depth -= 1) {
    const node = resolved.node(depth);
    if (node.isTextblock) return node;
  }
  return null;
}

/**
 * Resolves the inherited emphasis bit from the same first-owner node style
 * authority used by Canvas and SVG layout.
 *
 * @param state - Current Quire editor state.
 * @param textblock - Closest textblock owning the source fragment.
 * @param field - Ordinary emphasis field to inspect.
 * @returns Whether the calculated node style enables the emphasis.
 */
function readInheritedDirectEmphasis(
  state: QuireEditorState,
  textblock: Node,
  field: DirectEmphasisField
): boolean {
  for (const extension of state.extensions) {
    const resolve = extension.canvasTextStyle?.[textblock.type.name];
    if (resolve === undefined) continue;
    const style = resolve(textblock);
    return field === "bold"
      ? style?.fontWeight === "bold"
      : style?.fontStyle === "italic";
  }
  return false;
}
