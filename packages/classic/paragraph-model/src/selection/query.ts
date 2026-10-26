import type { QuireEditorState } from "@quirekit/core";
import {
  defaultWordParagraphFormatting,
  resolveWordParagraphFormatting,
  resolveWordParagraphIndentation
} from "../model";
import type { WordParagraphSelectionContext } from "../types";
import { collectSelectedWordParagraphs } from "./collect";

/** Default node types that carry Word paragraph formatting. */
export const defaultWordParagraphNodeNames = Object.freeze([
  "paragraph",
  "heading"
]);

/**
 * Reads the active paragraph ruler context without importing product UI.
 *
 * @param state - Current editor state and selection.
 * @param characterPitchTwips - Effective character pitch used for projection.
 * @param nodeNames - Registered paragraph-like node names.
 * @returns Active paragraph context, or undefined for non-text selections.
 */
export function readWordParagraphSelectionContext(
  state: QuireEditorState,
  characterPitchTwips: number,
  nodeNames: readonly string[] = defaultWordParagraphNodeNames
): WordParagraphSelectionContext | undefined {
  const paragraphs = collectSelectedWordParagraphs(state, nodeNames);
  const head = paragraphs.find(({ position, node }) => (
    state.pm.selection.head >= position
    && state.pm.selection.head <= position + node.nodeSize
  )) ?? paragraphs[0];
  if (head === undefined) return undefined;

  const formattingValues = paragraphs.map(({ node }) => (
    resolveWordParagraphFormatting(node.attrs.wordParagraph)
  ));
  const formatting = resolveWordParagraphFormatting(
    head.node.attrs.wordParagraph
  );
  const signature = JSON.stringify(formatting);
  const mixed = formattingValues.some((value) => (
    JSON.stringify(value) !== signature
  ));
  const legacyDirection: unknown = head.node.attrs.dir;
  const direction = formatting.direction
    ?? (
      legacyDirection === "rtl" || legacyDirection === "ltr"
        ? legacyDirection
        : "auto"
    );
  return {
    formatting: formatting ?? defaultWordParagraphFormatting,
    formattingValues,
    indentation: resolveWordParagraphIndentation(
      formatting.indentation,
      characterPitchTwips
    ),
    mixed,
    paragraphCount: paragraphs.length,
    direction
  };
}
