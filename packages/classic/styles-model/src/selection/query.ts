import type { QuireEditorState } from "@quirekit/core";
import {
  collectSelectedWordParagraphs,
  resolveWordParagraphFormatting
} from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphStyleRegistry } from "../model";
import type { WordParagraphStyleSelectionContext } from "./types";

/** Standard paragraph-like nodes owned by the Word style selector. */
export const defaultWordParagraphStyleNodeNames = Object.freeze([
  "paragraph",
  "heading"
] as const);

/**
 * Reads the effective named paragraph style across the active selection.
 *
 * Paragraphs without an explicit style reference resolve to the registry's
 * default paragraph style, so ordinary body text never appears blank in UI.
 *
 * @param state - Current editor state and document registry.
 * @param nodeNames - Paragraph-like node names owned by Word formatting.
 * @returns Selection style context, or undefined outside supported textblocks.
 */
export function readWordParagraphStyleSelectionContext(
  state: QuireEditorState,
  nodeNames: readonly string[] = defaultWordParagraphStyleNodeNames
): WordParagraphStyleSelectionContext | undefined {
  const paragraphs = collectSelectedWordParagraphs(state, nodeNames);
  if (paragraphs.length === 0) return undefined;
  const registry = resolveWordParagraphStyleRegistry(
    state.doc.attrs.wordStyleRegistry
  );
  const ids = paragraphs.map((target) => {
    const formatting = resolveWordParagraphFormatting(
      target.node.attrs.wordParagraph
    );
    return formatting.styleId ?? registry.defaultParagraphStyleId;
  });
  const first = ids[0] as string;
  const mixed = ids.some((id) => id !== first);
  const styleId = mixed ? null : first;
  return {
    registry,
    styleId,
    style: styleId === null ? null : registry.styles[styleId] ?? null,
    mixed,
    paragraphCount: paragraphs.length
  };
}
