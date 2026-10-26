import type { QuireEditorState } from "@quirekit/core";
import type {
  WordNumberingLevel,
  WordNumberingSequenceActionState,
  WordParagraphNumbering
} from "../types";
import {
  resolveWordNumberingRegistry,
  resolveWordParagraphNumbering
} from "../model";
import { resolveWordNumberingLevel } from "../resolver";
import { defaultWordNumberingParagraphTypes } from "./query";

/** One ordered paragraph participating in exact sequence-action resolution. */
interface IndexedOrderedParagraph {
  /** Absolute position immediately before the paragraph. */
  readonly position: number;
  /** Valid flat numbering reference owned by the paragraph. */
  readonly numbering: WordParagraphNumbering;
  /** Resolved level used for continuation compatibility. */
  readonly level: WordNumberingLevel;
}

/**
 * Reads WPS-like restart and continue eligibility for one ordered marker.
 *
 * @param state - Current canonical editor state.
 * @param position - Absolute position immediately before the target paragraph.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Exact sequence actions, or undefined for a non-ordered target.
 */
export function readWordNumberingSequenceActionState(
  state: Pick<QuireEditorState, "doc">,
  position: number,
  paragraphTypes: readonly string[] = defaultWordNumberingParagraphTypes
): WordNumberingSequenceActionState | undefined {
  const target = state.doc.nodeAt(position);
  const numbering = target === null
    ? null
    : resolveWordParagraphNumbering(target.attrs.wordNumbering);
  const registry = resolveWordNumberingRegistry(
    state.doc.attrs.wordNumberingRegistry
  );
  const level = numbering === null
    ? undefined
    : resolveWordNumberingLevel(registry, numbering.numId, numbering.level);
  if (numbering === null || numbering.task !== null || level === undefined || level.level.format === "bullet") {
    return undefined;
  }

  // Document order, not rendered labels, determines whether this paragraph is
  // already inside its concrete level sequence and which earlier sequence may join.
  const ordered = collectOrderedParagraphs(state, paragraphTypes);
  const targetIndex = ordered.findIndex((entry) => entry.position === position);
  if (targetIndex < 0) return undefined;
  const preceding = ordered.slice(0, targetIndex);
  const hasPrecedingSequenceItem = preceding.some((entry) =>
    entry.numbering.numId === numbering.numId
    && entry.numbering.level === numbering.level
  );
  const continuation = [...preceding].reverse().find((entry) =>
    entry.numbering.numId !== numbering.numId
    && entry.numbering.level === numbering.level
    && areWordNumberingLevelsContinuationCompatible(level.level, entry.level)
  );
  return {
    canRestart: hasPrecedingSequenceItem,
    canContinue: hasPrecedingSequenceItem
      ? numbering.startOverride !== null : continuation !== undefined || numbering.startOverride !== null,
    continuationNumId: hasPrecedingSequenceItem
      ? (numbering.startOverride === null ? null : numbering.numId)
      : continuation?.numbering.numId ?? null
  };
}

/**
 * Collects ordered paragraphs in canonical document order.
 *
 * @param state - Current canonical editor state.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Ordered paragraphs with valid numbering references.
 */
function collectOrderedParagraphs(
  state: Pick<QuireEditorState, "doc">,
  paragraphTypes: readonly string[]
): readonly IndexedOrderedParagraph[] {
  const allowed = new Set(paragraphTypes);
  const registry = resolveWordNumberingRegistry(
    state.doc.attrs.wordNumberingRegistry
  );
  const paragraphs: IndexedOrderedParagraph[] = [];
  state.doc.descendants((node, position) => {
    if (!node.isTextblock || !allowed.has(node.type.name)) return true;
    const numbering = resolveWordParagraphNumbering(node.attrs.wordNumbering);
    const level = numbering === null
      ? undefined
      : resolveWordNumberingLevel(registry, numbering.numId, numbering.level);
    if (numbering !== null && numbering.task === null && level !== undefined && level.level.format !== "bullet") {
      paragraphs.push({ position, numbering, level: level.level });
    }
    return false;
  });
  return paragraphs;
}

/**
 * Applies Word-compatible continuation matching for one ordered level.
 *
 * Level zero requires the same number format and level-text template. Nested
 * levels may continue from the nearest concrete sequence at the same level.
 *
 * @param target - Target sequence level.
 * @param candidate - Earlier candidate sequence level.
 * @returns Whether the candidate may own the continued counter.
 */
function areWordNumberingLevelsContinuationCompatible(
  target: WordNumberingLevel,
  candidate: WordNumberingLevel
): boolean {
  if (target.level !== candidate.level) return false;
  return target.level > 0
    || (target.format === candidate.format && target.text === candidate.text);
}
