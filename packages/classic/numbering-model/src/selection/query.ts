import {
  collectSelectedWordParagraphs,
  defaultWordParagraphCharacterPitchTwips,
  resolveWordParagraphSelection,
  resolveWordParagraphFormatting,
  resolveWordParagraphIndentation,
  type WordParagraphSelectionState
} from "@quirekit/classic-paragraph-model";
import type {
  WordListKind,
  WordNumberingParagraphSelectionContext,
  WordNumberingSelectionState
} from "../types";
import {
  resolveWordNumberingMarkers,
  resolveWordNumberingLevel
} from "../resolver";
import {
  resolveWordNumberingRegistry,
  resolveWordParagraphNumbering
} from "../model";

/** Default paragraph-like node names participating in Word numbering. */
export const defaultWordNumberingParagraphTypes = Object.freeze([
  "paragraph",
  "heading"
]);

/**
 * Reads product-facing list state across the current paragraph selection.
 *
 * @param state - Current editor state and selection.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Uniform, mixed, or plain numbering state.
 */
export function readWordNumberingSelectionState(
  state: WordParagraphSelectionState,
  paragraphTypes: readonly string[] = defaultWordNumberingParagraphTypes
): WordNumberingSelectionState {
  const targets = collectSelectedWordParagraphs(state, paragraphTypes);
  const registry = resolveWordNumberingRegistry(
    state.doc.attrs.wordNumberingRegistry
  );
  const records = targets.map(({ node }) => {
    const reference = resolveWordParagraphNumbering(node.attrs.wordNumbering);
    const resolved = reference === null
      ? undefined
      : resolveWordNumberingLevel(registry, reference.numId, reference.level);
    const kind: WordListKind | null = reference?.task !== null && reference?.task !== undefined
      ? "task"
      : resolved === undefined ? null : resolved.level.format === "bullet" ? "bullet" : "ordered";
    return {
      kind,
      level: reference?.level ?? null,
      checked: reference?.task?.checked ?? null
    };
  });
  const first = records[0];
  if (first === undefined) {
    return { kind: null, level: null, checked: null, paragraphCount: 0 };
  }
  const uniform = records.every((record) =>
    record.kind === first.kind
    && record.level === first.level
    && record.checked === first.checked
  );
  return {
    kind: uniform ? first.kind : "mixed",
    level: uniform ? first.level : null,
    checked: uniform ? first.checked : null,
    paragraphCount: targets.length
  };
}

/**
 * Reports whether every selected paragraph belongs to one list family.
 *
 * @param state - Current editor state.
 * @param kind - Ordered, bullet, or task family.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Whether the selection is uniformly active for the family.
 */
export function isWordListKindActive(
  state: WordParagraphSelectionState,
  kind: WordListKind,
  paragraphTypes: readonly string[] = defaultWordNumberingParagraphTypes
): boolean {
  const selection = readWordNumberingSelectionState(state, paragraphTypes);
  return selection.paragraphCount > 0 && selection.kind === kind;
}

/**
 * Reads numbering-aware effective paragraph indentation for the ruler.
 *
 * @param state - Current editor state and selection.
 * @param characterPitchTwips - Effective character pitch for ruler projection.
 * @param paragraphTypes - Registered paragraph-like node names.
 * @returns Paragraph context using level defaults plus direct overrides.
 */
export function readWordNumberingParagraphSelectionContext(
  state: WordParagraphSelectionState,
  characterPitchTwips = defaultWordParagraphCharacterPitchTwips,
  paragraphTypes: readonly string[] = defaultWordNumberingParagraphTypes
): WordNumberingParagraphSelectionContext | undefined {
  const targets = collectSelectedWordParagraphs(state, paragraphTypes);
  const selection = resolveWordParagraphSelection(state);
  const head = targets.find(({ position, node }) =>
    selection.head >= position
    && selection.head <= position + node.nodeSize
  ) ?? targets[0];
  if (head === undefined) return undefined;
  const markers = resolveWordNumberingMarkers(state.doc);
  const effectiveFormatting = (target: typeof head) => {
    const direct = resolveWordParagraphFormatting(target.node.attrs.wordParagraph);
    const marker = markers.get(target.position);
    return marker === undefined
      ? direct
      : { ...direct, indentation: marker.indentation };
  };
  const formatting = effectiveFormatting(head);
  const formattingValues = targets.map(effectiveFormatting);
  const signature = JSON.stringify(formatting.indentation);
  const mixed = formattingValues.some((value) =>
    JSON.stringify(value.indentation) !== signature
  );
  const legacyDirection: unknown = head.node.attrs.dir;
  const direction = formatting.direction
    ?? (
      legacyDirection === "rtl" || legacyDirection === "ltr"
        ? legacyDirection
        : "auto"
    );
  return {
    formatting,
    formattingValues,
    indentation: resolveWordParagraphIndentation(
      formatting.indentation,
      characterPitchTwips
    ),
    mixed,
    paragraphCount: targets.length,
    direction
  };
}
